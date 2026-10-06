import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error && (error.name === "AuthRetryableFetchError" || (error.status ?? 0) >= 500)) {
    return new NextResponse("Não foi possível verificar seu acesso agora. Aguarde alguns instantes e recarregue esta página.", {
      status: 503,
      headers: { "Cache-Control": "private, no-store", "Retry-After": "5", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  if (!user) {
    const redirect = NextResponse.redirect(new URL("/entrar", request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}

export const config = { matcher: ["/painel/:path*"] };
