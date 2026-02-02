import "./globals.css";
import { Montserrat, Inter } from "next/font/google";
import { IntroLoader} from "@/components/IntroLoader";
import { IntroLoaderGhosts } from "@/components/IntroLoaderGhosts";

const montserrat = Montserrat({
    subsets: ["latin"],
    variable: "--font-display",
    weight: ["300", "400", "600", "700", "800"],
});

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-body",
    weight: ["300", "400", "500", "600", "700"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="it" className={`${montserrat.variable} ${inter.variable}`}>
        <body>
            <IntroLoaderGhosts />
            {children}
        </body>
        </html>
    );
}
