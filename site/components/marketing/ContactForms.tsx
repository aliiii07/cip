"use client";

import { useState } from "react";
import { Magnetic } from "./Magnetic";

/**
 * Two doors: individuals join the waitlist, companies book a demo.
 *
 * There is no waitlist backend yet, so rather than fake a "you're in!"
 * confirmation the form composes a real email. Honest beats slick — and it
 * matches the rest of the product's posture.
 */

const INBOX = "hello@cip.example";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    const body = encodeURIComponent(
      `Please add me to the CIP early-access list.\n\nEmail: ${value}\n`
    );
    window.location.href = `mailto:${INBOX}?subject=${encodeURIComponent(
      "CIP early access"
    )}&body=${body}`;
    setSent(true);
  };

  return (
    <form onSubmit={submit} className="mt-6">
      <label htmlFor="waitlist-email" className="eyebrow">
        For individuals
      </label>
      <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
        <input
          id="waitlist-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11 flex-1 rounded-sm border border-hairline bg-transparent px-3.5 text-[14px] text-white placeholder:text-[#6a6a6a] transition-colors duration-200 focus:border-[#4a4a4a]"
        />
        <Magnetic>
          <button type="submit" className="btn btn-primary justify-center">
            Get early access
          </button>
        </Magnetic>
      </div>
      <p className="mt-3 text-[12.5px] text-muted-2">
        {sent
          ? "Opening your mail client — send the message and you're on the list."
          : "Opens a pre-filled email. We don't store anything until you send it."}
      </p>
    </form>
  );
}

export function DemoCta() {
  return (
    <div className="mt-6">
      <div className="eyebrow">For companies and prop firms</div>
      <Magnetic>
        <a
          href={`mailto:${INBOX}?subject=${encodeURIComponent("CIP — book a demo")}`}
          className="btn btn-ghost mt-3"
        >
          Book a demo
        </a>
      </Magnetic>
      <p className="mt-3 max-w-[36ch] text-[12.5px] text-muted-2">
        Team and prop-firm access is set up with us directly, not self-serve.
      </p>
    </div>
  );
}
