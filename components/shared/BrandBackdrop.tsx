"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Full-page ambient brand backdrop — three slow-breathing colour blobs
 * over the page background. Shared by the landing page and the auth
 * screens so the whole signed-out surface reads as one place.
 *
 * Kept deliberately cheap: opacity-only motion (no scale), a modest blur
 * radius, and fully static under prefers-reduced-motion — animated blur
 * filters are among the most expensive things a low-end phone's
 * compositor does.
 */
export function BrandBackdrop() {
  const reduceMotion = useReducedMotion();

  const blobs = [
    { color: "brand-gold", top: "-10%", right: "-8%", size: "clamp(18rem, 26vw, 36rem)", dur: 15, delay: 0 },
    { color: "brand-teal", top: "30%", left: "-12%", size: "clamp(16rem, 24vw, 32rem)", dur: 18, delay: 1.5 },
    { color: "brand-blue", top: "68%", right: "2%", size: "clamp(18rem, 27vw, 38rem)", dur: 16, delay: 0.8 },
  ];

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-2xl"
          style={{
            top: b.top,
            left: b.left,
            right: b.right,
            width: b.size,
            height: b.size,
            backgroundColor: `color-mix(in oklch, var(--${b.color}) 24%, transparent)`,
          }}
          animate={reduceMotion ? undefined : { opacity: [0.55, 0.85, 0.55] }}
          transition={{
            duration: b.dur,
            repeat: Infinity,
            ease: "easeInOut",
            delay: b.delay,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-background/40" />
    </div>
  );
}
