import { NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { createSupabaseServerClient } from "@/lib/supabase/server";


export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const type = request.nextUrl.searchParams.get("type");
  const isRecovery = type === "recovery";
  const next = safeNext(request.nextUrl.searchParams.get("next"));

  if (code) {
    const client = await createSupabaseServerClient();
    const { error } = await client.auth.exchangeCodeForSession(code);

    if (!error) {
      const target = isRecovery ? "/auth?mode=recovery" : next;
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/auth?error=email_confirmation_failed", request.url),
  );
}
