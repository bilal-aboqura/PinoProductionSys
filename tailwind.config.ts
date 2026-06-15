import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: "#A14323",
        secondary: "#665936",
        background: "#F7F3EE",
        surface: "#FFFFFF",
        accent: "#E1CEBE",
        success: "#4F7A52",
        warning: "#D6A04C",
        error: "#C65A5A",
        foreground: "#221F1C",
        muted: "#8A8075"
      },
      fontFamily: {
        cairo: ["var(--font-cairo)", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"]
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem"
      },
      screens: {
        print: { raw: "print" }
      },
      spacing: {
        "label-sm": "50mm",
        "label-std-w": "100mm",
        "label-std-h": "50mm",
        "label-lg": "100mm"
      }
    }
  },
  plugins: []
};

export default config;
