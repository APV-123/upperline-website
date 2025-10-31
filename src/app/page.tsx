import Hero from "./sections/hero";
import About from "./sections/about";
import WhatWeDo from "./sections/whatwedo";
import Pillars from "./sections/pillars";
import WhoWeAre from "./sections/whoweare";
import Footer from "./sections/footer";

export default function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Hero />
      <About />
      <WhatWeDo />
      <Pillars />
      <WhoWeAre />
      <Footer />
    </main>
  );
}
