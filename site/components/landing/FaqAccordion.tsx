"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Five rows on the page, the rest behind View all.
 *
 * One open at a time, and the panel animates height 0 → auto rather than a
 * fixed max-height: a max-height guess either clips the longer answers or
 * leaves the shorter ones easing through empty space.
 */

const QA: [string, string][] = [
  [
    "Why choose CIP?",
    "CIP gives you access to pro portfolios, plus every single strategy is verified by data, research, and AI risk models. It also works seamlessly across emerging markets.",
  ],
  [
    "How does Auto-Follow work?",
    "Auto-follow copies expert moves, but CIP re-checks and re-verifies each move with AI before it updates your paper portfolio.",
  ],
  [
    "Do I need to leave the app to trade?",
    "No. You follow, build, and track everything fully inside CIP.",
  ],
  [
    "Is CIP good if I am new to investing?",
    "Yes. CIP is beginner-friendly and explains each strategy’s numbers and risk metrics in plain language.",
  ],
  [
    "Is CIP safe?",
    "Safer by design: paper-first, no real money at risk when testing, honest simulated results.",
  ],
  [
    "How do I choose strategies?",
    "CIP suggests verified strategies tailored to your goals and risk profile; you keep full choice.",
  ],
  [
    "Do I need a new brokerage account?",
    "Paper: none. Real money: link a broker where supported.",
  ],
  ["What is the minimum amount to start?", "None in paper mode."],
  [
    "How much does CIP cost?",
    "Free to learn on paper; low-cost subscription for advanced verified strategies. CIP takes zero cut of your assets.",
  ],
];

function Row({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="border-b border-dark-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 py-6 text-left"
      >
        <span className="font-display text-[19px] font-semibold tracking-[-0.4px] text-white lg:text-[22px]">
          {q}
        </span>
        <span
          className="relative h-4 w-4 shrink-0"
          aria-hidden
          style={{ color: "#9F9D9B" }}
        >
          <span className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-current" />
          <span
            className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-current transition-transform duration-200"
            style={{ transform: open ? "scaleY(0)" : "scaleY(1)" }}
          />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-6 pr-10 font-body text-[16px] font-normal leading-[26px] text-text-dark-muted">
              {a}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIdx, setModalIdx] = useState<number | null>(0);
  const reduced = useReducedMotion();

  // Esc closes the overlay, and the page behind it stops scrolling while open.
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  return (
    <section id="faq" className="bg-true-black py-24 lg:py-[110px]">
      <div className="mx-auto max-w-content px-6 lg:px-0">
        <h2 className="font-display text-[32px] font-semibold leading-[1.05] tracking-[-0.5px] text-white lg:text-[42px] lg:leading-[42px]">
          Frequently Asked Questions
        </h2>

        <div className="mt-12 max-w-[860px]">
          {QA.slice(0, 5).map(([q, a], i) => (
            <Row
              key={q}
              q={q}
              a={a}
              open={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="mt-10 rounded-[80px] border border-dark-border px-5 py-4 font-display text-[18px] font-medium leading-none text-white transition-colors duration-200 hover:border-titanium"
        >
          View all
        </button>
      </div>

      <AnimatePresence>
        {modalOpen ? (
          <motion.div
            className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/80 p-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.18 }}
            onClick={() => setModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="All frequently asked questions"
          >
            <motion.div
              className="my-16 w-full max-w-[860px] bg-pure-black p-8 lg:p-12"
              initial={reduced ? false : { y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduced ? undefined : { y: 16, opacity: 0 }}
              transition={reduced ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-6">
                <h3 className="font-display text-[26px] font-semibold tracking-[-0.5px] text-white lg:text-[32px]">
                  Frequently Asked Questions
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="Close"
                  className="font-body text-[13px] uppercase tracking-[0.16em] text-text-dark-muted hover:text-white"
                >
                  Esc
                </button>
              </div>
              <div className="mt-8">
                {QA.map(([q, a], i) => (
                  <Row
                    key={q}
                    q={q}
                    a={a}
                    open={modalIdx === i}
                    onToggle={() => setModalIdx(modalIdx === i ? null : i)}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
