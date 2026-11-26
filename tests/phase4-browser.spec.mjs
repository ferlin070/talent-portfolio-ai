import { test, expect } from "@playwright/test";

const origin = "http://127.0.0.1:3000";
test.use({ baseURL: origin });

for (const width of [360,390,768,1440]) {
 test(`landing responsive at ${width}px`, async ({page}) => {
  await page.setViewportSize({width,height:900});
  await page.goto("/");
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  await expect(page.getByText("CONTOH PAPARAN",{exact:true})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
  expect(overflow).toBe(false);
  await page.getByRole("link",{name:"Build My Portfolio"}).click();
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("heading",{name:"Welcome back"})).toBeVisible();
 });
}

test("unauthenticated workspace routes redirect to sign in",async({page})=>{
 for(const route of ["/dashboard","/portfolio","/skills","/settings","/resume","/certificates"]){
  await page.goto(route);
  const url=new URL(page.url());
  expect(url.pathname).toBe("/auth");
  expect(url.searchParams.get("next")).toBe(route);
 }
});

test("login password visibility and reset controls",async({page})=>{
 await page.goto("/auth");
 const field=page.getByPlaceholder("Kata laluan akaun");
 await field.fill("synthetic-password");
 await expect(field).toHaveAttribute("type","password");
 await page.getByRole("button",{name:"Tunjuk kata laluan"}).click();
 await expect(field).toHaveAttribute("type","text");
 await page.getByRole("button",{name:"Sembunyikan kata laluan"}).click();
 await expect(field).toHaveAttribute("type","password");
 await page.getByRole("button",{name:"Forgot password?"}).click();
 await expect(page.getByRole("heading",{name:"Reset your password"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Send reset link"})).toBeVisible();
 await page.getByRole("button",{name:"Sign in",exact:true}).click();
 await page.getByRole("button",{name:"Create an account"}).click();
 await expect(page.getByRole("heading",{name:"Start your journey"})).toBeVisible();
});

test("invalid public slug has 404 status",async({request})=>{
 const response=await request.get("/u/a");
 expect(response.status()).toBe(404);
});
