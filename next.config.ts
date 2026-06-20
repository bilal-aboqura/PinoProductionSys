import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false
  },
  outputFileTracingIncludes: {
    "/*": ["./public/fonts/**/*"]
  }
};

export default withNextIntl(nextConfig);
