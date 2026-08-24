import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { LanguageProvider } from "../lib/i18n/LanguageContext";
import { getServerLocale } from "../lib/i18n/getServerLocale";
import { localeDirection } from "../lib/i18n/config";

export const metadata = {
  title: "Scheme Navigator — Find Government Welfare Schemes You Qualify For",
  description: "Describe your situation in plain language and find Indian government welfare schemes you're eligible for, from ~4,700 Central and State schemes.",
};

const THEME_INIT = `(function(){try{var saved=localStorage.getItem('sn_theme');var dark=saved==='dark'||(!saved&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }) {
  const locale = getServerLocale();
  return (
    <html lang={locale} dir={localeDirection(locale)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Yatra+One&family=Hind:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Sans+Gujarati:wght@400;500;600;700&family=Noto+Sans+Gurmukhi:wght@400;500;600;700&family=Noto+Sans+Kannada:wght@400;500;600;700&family=Noto+Sans+Malayalam:wght@400;500;600;700&family=Noto+Sans+Meetei+Mayek:wght@400;500;600;700&family=Noto+Sans+Ol+Chiki:wght@400;500;600;700&family=Noto+Sans+Oriya:wght@400;500;600;700&family=Noto+Sans+Tamil:wght@400;500;600;700&family=Noto+Sans+Telugu:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen flex flex-col">
        <LanguageProvider initialLocale={locale}><Header /><main className="flex-1">{children}</main><Footer /></LanguageProvider>
      </body>
    </html>
  );
}
