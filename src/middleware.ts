import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "@/i18n/routing";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always"
});

export default intlMiddleware;

export const config = {
  matcher: ["/", "/(ar|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"]
};
