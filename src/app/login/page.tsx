import Link from "next/link";

// Static placeholder. Real OTP/password auth is built in Phase 2 (see planner.md).
export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-24">
      <div className="w-full max-w-sm text-center">
        <span className="font-display text-lg font-semibold tracking-tight text-deep-space-ink">
          SSA Lab Portal
        </span>
        <h1 className="mt-6 font-display text-2xl font-semibold text-deep-space-ink">
          Login
        </h1>
        <p className="mt-3 font-body text-sm leading-relaxed text-slate-fog">
          Sign-in isn&rsquo;t wired up yet — OTP-based authentication lands in
          a later phase of the build.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-gradient-to-r from-nebula-violet to-pulsar-pink px-6 py-3 font-body text-sm font-semibold text-white shadow-lg shadow-pulsar-pink/20 transition-transform hover:scale-[1.02]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
