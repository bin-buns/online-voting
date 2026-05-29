import { Lato, Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-tsc-serif",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-tsc-sans",
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className={`${playfair.variable} ${lato.variable} tsc-auth-root`}>
      {children}
    </section>
  );
}
