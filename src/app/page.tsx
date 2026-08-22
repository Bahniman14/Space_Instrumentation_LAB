import Link from "next/link";
import {
  PrismSpectrumIcon,
  RadioArcsIcon,
  XRayBurstIcon,
} from "@/components/icons/lab-motifs";

const LABS = [
  {
    name: "X-Ray",
    experiments: 2,
    blurb: "Detector calibration and spectral analysis experiments.",
    Icon: XRayBurstIcon,
  },
  {
    name: "Radio Astronomy",
    experiments: 4,
    blurb: "Signal capture and analysis with a radio telescope.",
    Icon: RadioArcsIcon,
  },
  {
    name: "Optics",
    experiments: 3,
    blurb: "Classical and modern optics bench experiments.",
    Icon: PrismSpectrumIcon,
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Hero — the one surface where the brand gets full expression */}
      <div className="relative overflow-hidden bg-deep-space-ink text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-[-10%] h-[32rem] w-[32rem] rounded-full bg-gradient-to-br from-nebula-violet/40 to-pulsar-pink/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-14rem] left-[-8rem] h-[28rem] w-[28rem] rounded-full bg-pulsar-pink/10 blur-3xl"
        />

        <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8 sm:px-10">
          <span className="font-display text-lg font-semibold tracking-tight">
            SSA Lab Portal
          </span>
          <Link
            href="/login"
            className="rounded-full bg-gradient-to-r from-nebula-violet to-pulsar-pink px-5 py-2.5 font-body text-sm font-semibold text-white shadow-lg shadow-pulsar-pink/20 transition-transform hover:scale-[1.03]"
          >
            Login
          </Link>
        </header>

        <section className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-16 px-6 pb-24 pt-8 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pb-32">
          <div className="max-w-xl">
            <p className="font-data text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              IIT Kanpur &middot; Space Sciences &amp; Astronomy
            </p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              One portal for every{" "}
              <span className="bg-gradient-to-r from-nebula-violet to-pulsar-pink bg-clip-text text-transparent">
                lab report
              </span>
              .
            </h1>
            <p className="mt-6 font-body text-lg leading-relaxed text-white/70">
              Submit your PDF reports, track feedback from your TA and
              Supervisor, and see your grades for X-Ray, Radio Astronomy, and
              Optics — one portal, built for this course.
            </p>
            <div className="mt-9 flex items-center gap-4">
              <Link
                href="/login"
                className="rounded-full bg-gradient-to-r from-nebula-violet to-pulsar-pink px-7 py-3.5 font-body text-base font-semibold text-white shadow-lg shadow-pulsar-pink/25 transition-transform hover:scale-[1.02]"
              >
                Login to your account
              </Link>
            </div>
            <dl className="mt-14 flex gap-8 border-t border-white/10 pt-6 font-data text-xs uppercase tracking-[0.15em] text-white/50">
              <div>
                <dt className="sr-only">Labs</dt>
                <dd>3 Labs</dd>
              </div>
              <div>
                <dt className="sr-only">Experiments</dt>
                <dd>9 Experiments</dd>
              </div>
              <div>
                <dt className="sr-only">People</dt>
                <dd>33 People</dd>
              </div>
            </dl>
          </div>

          <div
            aria-hidden
            className="relative mx-auto aspect-square w-full max-w-sm lg:max-w-md"
          >
            <XRayBurstIcon className="absolute left-[6%] top-[8%] h-32 w-32 -translate-x-1/4 text-pulsar-pink drop-shadow-[0_0_28px_rgba(236,72,153,0.35)] sm:h-40 sm:w-40" />
            <RadioArcsIcon className="absolute right-[2%] top-[18%] h-32 w-32 translate-x-1/4 text-nebula-violet drop-shadow-[0_0_28px_rgba(109,40,217,0.4)] sm:h-40 sm:w-40" />
            <PrismSpectrumIcon className="absolute bottom-[6%] left-1/2 h-32 w-32 -translate-x-1/2 text-white drop-shadow-[0_0_28px_rgba(255,255,255,0.25)] sm:h-40 sm:w-40" />
          </div>
        </section>
      </div>

      {/* Labs overview — restrained, data-first */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:px-10">
        <h2 className="font-display text-2xl font-semibold text-deep-space-ink">
          The three labs
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {LABS.map(({ name, experiments, blurb, Icon }) => (
            <div
              key={name}
              className="rounded-2xl border border-black/5 p-6 shadow-sm"
            >
              <div className="inline-flex rounded-full bg-gradient-to-br from-nebula-violet to-pulsar-pink p-3 text-white">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-deep-space-ink">
                {name}
              </h3>
              <p className="mt-1 font-data text-xs uppercase tracking-[0.15em] text-slate-fog">
                {experiments} experiments
              </p>
              <p className="mt-3 font-body text-sm leading-relaxed text-slate-fog">
                {blurb}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-black/5">
        <div className="mx-auto w-full max-w-6xl px-6 py-8 text-center font-data text-xs uppercase tracking-[0.15em] text-slate-fog sm:px-10">
          Space Sciences &amp; Astronomy Lab Portal &middot; IIT Kanpur
        </div>
      </footer>
    </div>
  );
}
