import type { Config } from "tailwindcss";

export default {
    content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--fonts-sans)"],
                display: ["var(--fonts-display)"],
            },
            colors: {
                background: "var(--color-background)",
                foreground: "var(--color-foreground)",
                muted: "var(--color-muted)",
                glass: "var(--color-glass)",
                accent: "var(--color-accent)",
                evolve: "var(--color-evolve)",
            },
        },
    },
    plugins: [],
} satisfies Config;
