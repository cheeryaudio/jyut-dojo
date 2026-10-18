import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#253650",
        paper: "#f7fbff",
        ember: "#2367ce",
        "ember-dark": "#1c54af",
      },
      fontFamily: {
        sans: ["Noto Sans HK", "PingFang SC", "PingFang HK", "Microsoft YaHei", "Microsoft JhengHei", "sans-serif"],
        jyutping: ["IBM Plex Mono", "SFMono-Regular", "Consolas", "monospace"],
      },
      boxShadow: {
        warm: "0 12px 32px rgba(58, 103, 164, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
