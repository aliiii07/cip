"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { FAQ } from "@/lib/parrot-content";

function Row({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const reduced = useReducedMotion();
  return (
    <div className="border-b border-[#1a1a1a]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 py-7 text-left"
      >
        <span className="font-display text-[20px] font-normal text-[#1a1a1a] lg:text-[28px]">{q}</span>
        <ChevronDown
          className={`h-7 w-7 shrink-0 text-[#1a1a1a] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
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
            <p className="pb-7 pr-12 font-body text-[16px] leading-[27px] text-[#4a4a4a] lg:text-[19px] lg:leading-[31px]">{a}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIdx, setModalIdx] = useState<number | null>(0);
  const reduced = useReducedMotion();

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
    <section id="faq" className="bg-white py-24 lg:py-[130px]">
      <div className="mx-auto max-w-[1580px] px-6 lg:px-[60px]">
        <h2 className="text-center font-display text-[36px] font-semibold leading-[1.05] tracking-[-1px] text-[#1a1a1a] lg:text-[56px]">
          Frequently Asked Questions
        </h2>

        <div className="mt-12 lg:mt-20">
          {FAQ.map((item, i) => (
            <Row key={item.q} q={item.q} a={item.a} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="font-display text-[26px] font-medium text-[#1a1a1a] transition-opacity hover:opacity-60 lg:text-[32px]"
          >
            View All
          </button>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen ? (
          <motion.div
            className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm"
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
              className="my-16 w-full max-w-[900px] rounded-[20px] bg-white p-8 lg:p-12"
              initial={reduced ? false : { y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduced ? undefined : { y: 16, opacity: 0 }}
              transition={reduced ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-6">
                <h3 className="font-display text-[28px] font-semibold tracking-[-0.5px] text-[#1a1a1a] lg:text-[36px]">
                  Frequently Asked Questions
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="Close"
                  className="font-body text-[13px] uppercase tracking-[0.16em] text-[#71717A] hover:text-[#1a1a1a]"
                >
                  Esc
                </button>
              </div>
              <div className="mt-6">
                {FAQ.map((item, i) => (
                  <Row key={item.q} q={item.q} a={item.a} open={modalIdx === i} onToggle={() => setModalIdx(modalIdx === i ? null : i)} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
