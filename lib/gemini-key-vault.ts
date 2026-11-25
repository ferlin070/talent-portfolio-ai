/** Encrypted browser vault: never persist plaintext keys or passphrases. */
export type VaultEntry = { label: string; secret: string };

export type VaultEnvelope =
  | { version: 1; salt: string; iv: string; ciphertext: string }
  | {
      version: 2;
      iterations: number;
      salt: string;
      iv: string;
      ciphertext: string;
    };

const OLD_ITERATIONS = 250_000;
const NEW_ITERATIONS = 600_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function asBuffer(value: Uint8Array): ArrayBuffer {
  return Uint8Array.from(value).buffer as ArrayBuffer;
}

function encodeBase64(value: Uint8Array): string {
  let result = "";
  for (const byte of value) result += String.fromCharCode(byte);
  return btoa(result);
}

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    asBuffer(encoder.encode(passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: asBuffer(salt),
      iterations,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptVault(
  passphrase: string,
  entries: VaultEntry[],
): Promise<VaultEnvelope> {
  if (passphrase.length < 12) {
    throw new Error("Gunakan kata laluan vault sekurang-kurangnya 12 aksara.");
  }

  if (entries.length < 1 || entries.length > 5) {
    throw new Error("Vault menerima antara satu hingga lima API key.");
  }

  if (entries.some((entry) => !entry.secret.trim())) {
    throw new Error("Sila masukkan semua API key sebelum menyimpan.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, NEW_ITERATIONS);
  const plaintext = encoder.encode(JSON.stringify(entries));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBuffer(iv) },
    key,
    asBuffer(plaintext),
  );

  return {
    version: 2,
    iterations: NEW_ITERATIONS,
    salt: encodeBase64(salt),
    iv: encodeBase64(iv),
    ciphertext: encodeBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptVault(
  passphrase: string,
  envelope: VaultEnvelope,
): Promise<VaultEntry[]> {
  if (!envelope || ![1, 2].includes(envelope.version)) {
    throw new Error("Format vault tidak disokong.");
  }

  const iterations =
    envelope.version === 1 ? OLD_ITERATIONS : envelope.iterations;

  if (
    iterations !== OLD_ITERATIONS &&
    iterations !== NEW_ITERATIONS
  ) {
    throw new Error("Tetapan keselamatan vault tidak disokong.");
  }

  const salt = decodeBase64(envelope.salt);
  const iv = decodeBase64(envelope.iv);

  if (salt.byteLength !== 16 || iv.byteLength !== 12) {
    throw new Error("Metadata vault tidak sah.");
  }

  const key = await deriveKey(passphrase, salt, iterations);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBuffer(iv) },
    key,
    asBuffer(decodeBase64(envelope.ciphertext)),
  );

  const content: unknown = JSON.parse(decoder.decode(plaintext));

  if (
    !Array.isArray(content) ||
    content.length > 5 ||
    !content.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof entry.label === "string" &&
        typeof entry.secret === "string",
    )
  ) {
    throw new Error("Kandungan vault tidak sah.");
  }

  return content as VaultEntry[];
}

/** Retain the v1 storage key so existing encrypted data remains discoverable. */
export const vaultStorageKey = (userId: string): string =>
  `talentfolio:gemini:vault:v1:${userId}`;
