import "./globals.css";
import localFont from "next/font/local";
import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";
import { CookieConsentProvider } from "@/components/legal/cookie-consent-provider";
import { CookiePreferencesModal } from "@/components/legal/cookie-preferences-modal";

const montserrat = localFont({
    src: "./fonts/Montserrat-latin-variable.woff2",
    variable: "--fonts-display",
    weight: "100 900",
    style: "normal",
    display: "swap",
});

const inter = localFont({
    src: "./fonts/Inter-latin-variable.woff2",
    variable: "--fonts-body",
    weight: "100 900",
    style: "normal",
    display: "swap",
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
