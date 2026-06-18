import "./globals.css";
import { Montserrat, Inter } from "next/font/google";
import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";
import { CookieConsentProvider } from "@/components/legal/cookie-consent-provider";
import { CookiePreferencesModal } from "@/components/legal/cookie-preferences-modal";

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
            <body>
                <CookieConsentProvider>
                    {children}
                    <CookieConsentBanner />
                    <CookiePreferencesModal />
                </CookieConsentProvider>
            </body>
        </html>
    );
}
