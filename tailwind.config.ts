import type { Config } from "tailwindcss";

export default {
    content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-sans)"],
                display: ["var(--font-display)"],
            },
            colors: {
                background: "var(--color-background)",
                foreground: "var(--color-foreground)",
                muted: "var(--color-muted)",
                glass: "var(--color-glass)",
                accent: "var(--color-accent)",
            },
        },
    },
    plugins: [],
} satisfies Config;
