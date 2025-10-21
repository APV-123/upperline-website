import Hero from "./sections/hero";
import About from "./sections/about";
import WhatWeDo from "./sections/whatwedo";
import Footer from "./sections/footer";

export default function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Hero />
      <About />
      <WhatWeDo />
      <Footer />
    </main>
  );
}
