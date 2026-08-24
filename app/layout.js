import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { LanguageProvider } from "../lib/i18n/LanguageContext";
import { getServerLocale } from "../lib/i18n/getServerLocale";

export const metadata = {
  title: "Scheme Navigator — Find Government Welfare Schemes You Qualify For",
  description:
    "Describe your situation in plain language and find Indian government welfare schemes you're eligible for, from ~4,700 Central and State schemes. Available in English, Hindi, Telugu, and Tamil.",
};

export default function RootLayout({ children }) {
  const locale = getServerLocale();

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Yatra+One&family=Hind:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Sans+Telugu:wght@400;500;600;700&family=Noto+Sans+Tamil:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <LanguageProvider initialLocale={locale}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
