import type { SVGProps } from "react";

/**
 * The three lab motifs referenced in CLAUDE.md §10 (Design System). This is the
 * one recurring visual device across the product — landing hero, TA/Supervisor
 * lab badges, and empty states all reuse these three icons rather than
 * introducing new decoration.
 */

export function XRayBurstIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="32" cy="32" r="4.5" fill="currentColor" />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 12;
        const inner = 9;
        const outer = i % 2 === 0 ? 28 : 20;
        const x1 = 32 + Math.cos(angle) * inner;
        const y1 = 32 + Math.sin(angle) * inner;
        const x2 = 32 + Math.cos(angle) * outer;
        const y2 = 32 + Math.sin(angle) * outer;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export function RadioArcsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="18" cy="46" r="3.5" fill="currentColor" />
      <path
        d="M18 46 C18 30, 30 18, 46 18"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <path
        d="M12 46a24 24 0 0 1 24-24"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        opacity="0.65"
      />
      <path
        d="M6 46a30 30 0 0 1 30-30"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}

export function PrismSpectrumIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <line x1="8" y1="32" x2="24" y2="32" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      <path
        d="M24 44 L32 20 L40 44 Z"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinejoin="round"
      />
      <line x1="40" y1="30" x2="54" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <line x1="40" y1="34" x2="56" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
      <line x1="40" y1="38" x2="56" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <line x1="40" y1="42" x2="54" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}
