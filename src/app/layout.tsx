import "./globals.css";
import { Montserrat, Inter } from "next/font/google";

const montserrat = Montserrat({
    subsets: ["latin"],
    variable: "--fonts-display",
    weight: ["300", "400", "600", "700", "800"],
});

const inter = Inter({
    subsets: ["latin"],
    variable: "--fonts-body",
    weight: ["300", "400", "500", "600", "700"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="it" className={`${montserrat.variable} ${inter.variable}`}>
            <body>{children}</body>
        </html>
    );
}
