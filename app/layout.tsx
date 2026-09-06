import type { Metadata } from "next";
import "./globals.css";
import "./product-ui.css";
import "./notification-ui.css";
import "./legacy-product-polish.css";

export const metadata: Metadata = {
  title: "BarbeariaSP | Agenda e gestão para barbearias",
  description: "Agenda online, clientes, equipe, comissões e relatórios para barbearias.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><head><meta name="referrer" content="no-referrer" /></head><body className="antialiased">{children}</body></html>;
}
