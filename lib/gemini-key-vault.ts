/** Local, passphrase-encrypted key vault. Never stores raw API keys or passphrases. */
export type VaultEntry={label:string;secret:string};
export type VaultEnvelope={version:1;salt:string;iv:string;ciphertext:string};
const ITERATIONS=250000;
const enc=new TextEncoder();
const dec=new TextDecoder();
const asBuffer=(value:Uint8Array):ArrayBuffer=>Uint8Array.from(value).buffer as ArrayBuffer;
function toB64(bytes:Uint8Array){let s="";for(const byte of bytes)s+=String.fromCharCode(byte);return btoa(s)}
function fromB64(value:string){const raw=atob(value);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function derive(passphrase:string,salt:Uint8Array){
 const material=await crypto.subtle.importKey("raw",asBuffer(enc.encode(passphrase)),"PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey({name:"PBKDF2",salt:asBuffer(salt),iterations:ITERATIONS,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
export async function encryptVault(passphrase:string,entries:VaultEntry[]):Promise<VaultEnvelope>{
 if(passphrase.length<12)throw Error("Kata laluan vault mesti sekurang-kurangnya 12 aksara.");
 if(entries.length<1||entries.length>5)throw Error("Vault menerima maksimum 5 API key.");
 if(entries.some(x=>!x.secret.trim()))throw Error("Masukkan API key sebelum menyimpan.");
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await derive(passphrase,salt);
 const clear=enc.encode(JSON.stringify(entries));
 const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv:asBuffer(iv)},key,asBuffer(clear));
 return {version:1,salt:toB64(salt),iv:toB64(iv),ciphertext:toB64(new Uint8Array(encrypted))};
}
export async function decryptVault(passphrase:string,envelope:VaultEnvelope):Promise<VaultEntry[]>{
 if(!envelope||envelope.version!==1)throw Error("Format vault tidak disokong.");
 const key=await derive(passphrase,fromB64(envelope.salt));
 const clear=await crypto.subtle.decrypt({name:"AES-GCM",iv:asBuffer(fromB64(envelope.iv))},key,asBuffer(fromB64(envelope.ciphertext)));
 const result:unknown=JSON.parse(dec.decode(clear));
 if(!Array.isArray(result)||result.length>5||!result.every(x=>x&&typeof x==="object"&&typeof x.secret==="string"&&typeof x.label==="string"))throw Error("Kandungan vault tidak sah.");
 return result as VaultEntry[];
}
export const vaultStorageKey=(userId:string)=>`talentfolio:gemini:vault:v1:${userId}`;
