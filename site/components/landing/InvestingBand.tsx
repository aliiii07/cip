"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * The 324px closing band.
 *
 * There is no waitlist backend, so the email field composes a real message
 * rather than faking a confirmation. No app-store lockup: there is no app to
 * download, and a store badge for a product that ships nowhere would be the
 * one dishonest pixel on the page.
 */

const INBOX = "hello@netcip.com";

export function InvestingBand() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    window.location.href = `mailto:${INBOX}?subject=${encodeURIComponent(
      "CIP early access"
    )}&body=${encodeURIComponent(`Please add me to the CIP list.\n\nEmail: ${value}\n`)}`;
    setSent(true);
  };

  return (
    <section className="flex min-h-[324px] items-center bg-dark-bg-2 py-20">
      <div className="mx-auto flex max-w-content flex-col items-center px-6 text-center lg:px-0">
        <h2 className="max-w-[720px] font-display text-[30px] font-semibold leading-[1.12] tracking-[-1px] text-white lg:text-[42px]">
          Start testing on paper
        </h2>

        <Link
          href="/prototype"
          className="mt-8 inline-block rounded-[80px] bg-white px-5 py-4 font-display text-[20px] font-medium leading-none text-pure-black transition-transform duration-200 hover:scale-[1.03]"
        >
          Start testing on paper
        </Link>

        <form onSubmit={submit} className="mt-8 flex w-full max-w-[386px] flex-col gap-2.5 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            className="h-12 flex-1 rounded-[80px] border border-dark-border bg-transparent px-5 font-body text-[15px] text-white outline-none transition-colors placeholder:text-text-light-muted focus:border-titanium"
          />
          <button
            type="submit"
            className="h-12 rounded-[80px] border border-dark-border px-6 font-display text-[16px] font-medium text-white transition-colors duration-200 hover:border-titanium"
          >
            Submit
          </button>
        </form>

        <p className="mt-4 font-body text-[13px] font-light text-text-light-muted">
          {sent
            ? "Opening your mail client. Send the message and you’re on the list."
            : "Opens a pre-filled email. Nothing is stored until you send it."}
        </p>
      </div>
    </section>
  );
}
