import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pequenocristozinho.vps11710.panel.icontainer.work";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pequeno Cristãozinho | Fé, criatividade e descobertas",
    template: "%s | Pequeno Cristãozinho",
  },
  description: "Materiais cristãos infantis para aprender a Palavra de Deus brincando, colorindo e criando lindas memórias em família, na igreja e na Escola Bíblica Dominical.",
  applicationName: "Pequeno Cristãozinho",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Pequeno Cristãozinho",
    title: "Pequeno Cristãozinho | Pequenos corações, grandes descobertas",
    description: "Um cantinho de fé, criatividade e descobertas para os pequenos.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
