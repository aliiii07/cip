import type { Metadata } from "next";
import { Navbar } from "@/components/parrot/Navbar";
import { Footer } from "@/components/parrot/Footer";
import { PartnerForm } from "@/components/parrot/PartnerForm";

export const metadata: Metadata = { title: "Partner with Us · CIP" };

export default function PartnerPage() {
  return (
    <div className="pf-root">
      <Navbar />
      <main className="bg-parrot-dark px-6 pb-24 pt-[160px]">
        <div className="mx-auto w-full max-w-[560px]">
          <h1 className="text-center font-display text-[36px] font-semibold tracking-[-1px] text-white lg:text-[48px]">
            Partner with Us
          </h1>
          <p className="mt-4 text-center font-body text-[18px] leading-[28px] text-[#A1A1AA]">
            Tell us a little about you and what you have in mind. We read every message.
          </p>
          <PartnerForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
