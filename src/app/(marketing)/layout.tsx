import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SkipLink } from "@/components/layout/skip-link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SkipLink />
      <Header />
      <main id="main-content" tabIndex={-1} className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
