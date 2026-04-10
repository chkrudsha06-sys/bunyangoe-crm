import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0B1629",
          "navy-light": "#132044",
          gold: "#C9A84C",
          "gold-light": "#E8C97A",
          surface: "#1A2A4A",
          border: "#2A3F6F",
          text: "#E2E8F0",
          muted: "#94A3B8",
        },
      },
    },
  },
  plugins: [],
};
export default config;
