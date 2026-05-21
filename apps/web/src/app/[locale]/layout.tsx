import { DocumentLang } from "@/components/i18n/DocumentLang";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { routing } from "@/i18n/routing";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Noto_Sans_SC } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { notFound } from "next/navigation";

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-sc",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const localeClass = locale === "zh" ? notoSansSc.variable : "";

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DocumentLang />
      <NuqsAdapter>
        <div dir={dir} className={`wrap${localeClass ? ` ${localeClass}` : ""}`}>
          <Header />
          <main className="page-main">{children}</main>
          <Footer />
        </div>
      </NuqsAdapter>
    </NextIntlClientProvider>
  );
}
