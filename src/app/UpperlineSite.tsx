"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function UpperlineSite() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 text-neutral-900">
      
      <section className="max-w-4xl p-8 text-center">
        <div className="bg-primary text-primary-foreground p-4 rounded mb-4">
  Navy via tokens (Upperline primary)
</div>

<div className="bg-secondary text-secondary-foreground p-4 rounded mb-8">
  Turquoise via tokens (Upperline secondary)
</div>

<Button className="bg-primary text-primary-foreground hover:opacity-95">
  Talk to us
</Button>


        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-semibold tracking-tight"
        >
          Upperline Companies
        </motion.h1>
        <p className="mt-6 text-lg text-neutral-600">
          Investing and developing at the intersection of land, capital, and
          design — powered by discipline, partnership, and stewardship.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4">
          <Button>Explore Our Work</Button>
          <Button variant="outline">Contact Us</Button>
        </div>
      </section>

      <section className="mt-20 grid w-full max-w-5xl gap-6 px-8 md:grid-cols-3">
        {["Industrial", "Retail", "Mixed-Use"].map((title) => (
          <Card key={title}>
            <CardContent className="p-6">
              <h3 className="text-xl font-medium">{title}</h3>
              <p className="mt-2 text-sm text-neutral-600">
                Thoughtful, enduring projects built for long-term value.
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-24 w-full max-w-xl px-8 pb-24">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-2xl font-medium mb-4">Get in Touch</h3>
            <form className="flex flex-col gap-3">
              <Input placeholder="Name" />
              <Input placeholder="Email" type="email" />
              <Textarea placeholder="Message" />
              <Button type="submit" className="mt-2">
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
