import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full py-10 mt-0">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 text-sm text-neutral-600">
        
        {/* Left: Email */}
        <div className="order-2 md:order-1">
          <a
            href="mailto:admin@upperlineco.com"
            className="hover:text-neutral-900 transition-colors"
          >
            admin@upperlineco.com
          </a>
        </div>

        {/* Center: Address */}
        <div className="order-1 md:order-2 text-center leading-tight">
          <p>3355 W Alabama St, Ste 720</p>
          <p>Houston, Texas 77098</p>
        </div>

        {/* Right: Logo */}
        <div className="order-3">
          <Image
            src="/upperline-logo.png"
            alt="Upperline logo"
            width={280}
            height={80}
            className="object-contain"
          />
        </div>
      </div>
    </footer>
  );
}
