import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const buttonStyles = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "bg-white text-ink border border-line hover:bg-paper",
  danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
};

type Variant = keyof typeof buttonStyles;

function buttonClass(variant: Variant, className = "") {
  return `inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${buttonStyles[variant]} ${className}`;
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-line bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions, back }: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="text-sm text-muted hover:text-ink">
          ← {back.label}
        </Link>
      )}
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3 py-2 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function Input(props: ComponentProps<"input">) {
  return <input className={inputClass} {...props} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select className={inputClass} {...props} />;
}

export function KidAvatar({ name, color, size = "md" }: { name: string; color: string; size?: "md" | "lg" }) {
  const dims = size === "lg" ? "h-16 w-16 text-2xl" : "h-12 w-12 text-lg";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${dims}`}
      style={{ background: color }}
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
