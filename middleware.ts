import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/safe-next";

const protectedPages = new Set([
  "dashboard",
  "profile",
  "projects",
  "education",
  "experience",
  "certificates",
  "skills",
  "portfolio",
  "resume",
  "settings",
  "prompt-generator",
  "institution",
]);


export async function middleware(request: NextRequest) {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!projectUrl || !publicKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const client = createServerClient(projectUrl, publicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(values) {
        values.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // getUser revalidates the session rather than trusting user cookie metadata.
  const {
    data: { user },
  } = await client.auth.getUser();

  const first = request.nextUrl.pathname.split("/")[1];
  const isProtected = protectedPages.has(first);
  const isAuth = request.nextUrl.pathname === "/auth";
  const isRecovery =
    request.nextUrl.searchParams.get("mode") === "recovery";

  if (isProtected && !user) {
    const url = new URL("/auth", request.url);
    url.searchParams.set(
      "next",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  }

  if (isAuth && user && !isRecovery) {
    const destination = safeNext(request.nextUrl.searchParams.get("next"));
    const redirect = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/auth",
    "/dashboard/:path*",
    "/profile/:path*",
    "/projects/:path*",
    "/education/:path*",
    "/experience/:path*",
    "/certificates/:path*",
    "/skills/:path*",
    "/portfolio/:path*",
    "/resume/:path*",
    "/settings/:path*",
    "/prompt-generator/:path*",
    "/institution/:path*",
  ],
};
