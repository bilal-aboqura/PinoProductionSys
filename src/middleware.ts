import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { defaultLocale, locales } from "@/i18n/routing";
import { updateSession } from "@/utils/supabase/middleware";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always"
});

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  return updateSession(request, response);
}

export const config = {
  matcher: ["/", "/(ar|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"]
};
