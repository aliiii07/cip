"use client";

import { useState } from "react";
import { BRAND } from "@/lib/parrot-content";

/**
 * A simple contact form. There is no backend yet, so submitting composes an
 * email to the contact address with the fields filled in; nothing is stored
 * until the sender actually sends it.
 */
export function PartnerForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const field =
    "w-full rounded-[14px] border border-[#3F3F46] bg-transparent px-4 py-3 font-body text-[16px] text-white outline-none transition-colors placeholder:text-[#71717A] focus:border-white";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Partnership inquiry from ${name.trim() || "the website"}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}\n`);
    window.location.href = `mailto:${BRAND.email}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <form onSubmit={submit} className="mt-10 space-y-4">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" required className={field} />
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" aria-label="Email address" required className={field} />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What would you like to build together?" aria-label="Message" rows={5} required className={field} />
      <button
        type="submit"
        className="w-full rounded-[80px] bg-white px-7 py-4 font-display text-[20px] font-medium leading-none text-parrot-black transition-transform duration-200 hover:scale-[1.02]"
      >
        Send message
      </button>
      <p className="text-center font-body text-[13px] text-[#71717A]">
        {sent
          ? "Opening your mail app with the message filled in. Send it and we will get back to you."
          : `Opens a pre filled email to ${BRAND.email}. Nothing is stored until you send it.`}
      </p>
    </form>
  );
}
