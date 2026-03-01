import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-[70px] flex items-center">
        <Container size="sm" className="py-24 text-center">
          <p className="text-8xl font-serif font-bold text-navy-600 opacity-20 leading-none mb-6">
            404
          </p>
          <h1 className="text-display-md font-serif font-semibold text-navy-700 mb-4">
            Page Not Found
          </h1>
          <p className="text-base text-slate-500 mb-8 max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/">
              <Button variant="primary" size="lg">Back to Home</Button>
            </Link>
            <Link href="/properties">
              <Button variant="outline" size="lg">Search Properties</Button>
            </Link>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
