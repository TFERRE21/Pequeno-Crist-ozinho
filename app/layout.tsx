import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"Pequeno Cristãozinho | Materiais cristãos infantis", description:"Materiais digitais cristãos para crianças, famílias, EBD e ministérios infantis." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="pt-BR"><body>{children}</body></html>; }
