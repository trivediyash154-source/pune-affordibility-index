"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useCountUp } from "@/lib/hooks/useCountUp";

function CountNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const n = useCountUp(value, 1.4, decimals);
  return <>{n.toLocaleString("en-IN")}</>;
}

function Stat({ value, label, decimals = 0 }: { value: number; label: string; decimals?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-3xl font-semibold text-accent sm:text-4xl">
        {inView ? <CountNumber value={value} decimals={decimals} /> : "0"}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wide text-text-muted">{label}</div>
    </div>
  );
}

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5 },
};

export default function Home() {
  return (
    <div>
      {/* hero */}
      <section className="particle-grid relative flex min-h-[88vh] flex-col items-center justify-center px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl font-display text-4xl font-semibold leading-tight text-text-primary sm:text-6xl"
        >
          Pune&apos;s livability changes with the seasons.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-5 max-w-2xl text-base text-text-muted sm:text-lg"
        >
          A data-driven affordability index across 27 localities — real rent, real air quality,
          real tradeoffs.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/explorer"
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Explore the Index
          </Link>
          <Link
            href="/methodology"
            className="rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-text-primary transition hover:border-accent"
          >
            Read the Methodology
          </Link>
        </motion.div>

        <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-14">
          <Stat value={27} label="Localities" />
          <Stat value={1779} label="Real Listings" />
          <Stat value={572} label="AQI Days" />
          <Stat value={3} label="Seasons" />
        </div>
      </section>

      {/* why static fails */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <motion.h2 {...reveal} className="mb-8 font-display text-3xl font-semibold text-text-primary">
          Why static indices fail
        </motion.h2>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              t: "Rent changes. AQI doesn't.",
              b: "Most affordability tools use a single annual average. Pune's winter AQI (114.5) is 2.3× worse than monsoon (50.5).",
            },
            {
              t: "Your priorities aren't average.",
              b: "A student optimises for rent. A remote worker optimises for clean air. A single ranking serves no one well.",
            },
            {
              t: "Real data, honestly disclosed.",
              b: "1,779 real MagicBricks listings. CPCB government monitoring. OSM amenities. Every proxy documented.",
            },
          ].map((c, i) => (
            <motion.div key={c.t} {...reveal} transition={{ duration: 0.5, delay: i * 0.1 }} className="glass glass-hover rounded-2xl p-6">
              <h3 className="font-display text-xl font-semibold text-accent">{c.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{c.b}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <motion.h2 {...reveal} className="mb-8 font-display text-3xl font-semibold text-text-primary">
          How it works
        </motion.h2>
        <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center">
          {[
            { i: "🏠", t: "Real Rent Data", s: "MagicBricks · 1,779 listings" },
            { i: "🌍", t: "6 Dimensions", s: "Rent · COL · Commute · AQI · Safety · Lifestyle" },
            { i: "🌦️", t: "Seasonal AQI", s: "Monsoon / Summer / Winter" },
            { i: "👤", t: "Persona Match", s: "5 profiles · tunable weights" },
          ].map((step, i, arr) => (
            <div key={step.t} className="flex flex-1 items-center gap-4">
              <motion.div {...reveal} transition={{ duration: 0.5, delay: i * 0.1 }} className="glass flex-1 rounded-2xl p-5 text-center">
                <div className="text-3xl">{step.i}</div>
                <div className="mt-2 font-semibold text-text-primary">{step.t}</div>
                <div className="mt-1 text-xs text-text-muted">{step.s}</div>
              </motion.div>
              {i < arr.length - 1 && <span className="hidden text-accent md:block">→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* seasonal finding */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <motion.div {...reveal} className="glass rounded-3xl border-accent p-8 text-center shadow-glow">
          <div className="text-xs uppercase tracking-widest text-text-muted">The seasonal finding</div>
          <div className="mt-4 flex items-center justify-center gap-4 font-display text-4xl font-semibold sm:text-5xl">
            <span className="text-teal">50.5</span>
            <span className="text-text-subtle">→</span>
            <span className="text-coral">114.5</span>
          </div>
          <div className="mt-2 text-sm text-text-muted">Monsoon → Winter mean AQI (2.3× worse)</div>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-text-muted">
            Official CPCB AQI computed from PM2.5, PM10, NO2, SO2, CO, Ozone sub-indices.
            572 valid monitoring days. Dominant pollutant: PM10.
          </p>
          <Link href="/explorer" className="mt-6 inline-block text-sm font-semibold text-accent hover:underline">
            See all rankings →
          </Link>
        </motion.div>
      </section>

      {/* footer */}
      <footer className="border-t border-[var(--border)] px-6 py-10 text-center text-sm text-text-muted">
        <div className="font-medium text-text-primary">VIT Pune · IEEE GSCon 2027 Submission · Yash Trivedi</div>
        <div className="mt-3 flex flex-wrap justify-center gap-4">
          <Link href="/explorer" className="hover:text-accent">Explorer</Link>
          <Link href="/compare" className="hover:text-accent">Compare</Link>
          <Link href="/personas" className="hover:text-accent">Personas</Link>
          <Link href="/methodology" className="hover:text-accent">Methodology</Link>
        </div>
        <div className="mt-4 text-xs text-text-subtle">
          All data sources documented. Research conducted June 2026.
        </div>
      </footer>
    </div>
  );
}
