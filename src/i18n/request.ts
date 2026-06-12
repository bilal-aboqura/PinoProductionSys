import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/routing";

export default getRequestConfig(async ({ locale }) => {
  if (!locale || !isLocale(locale)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
