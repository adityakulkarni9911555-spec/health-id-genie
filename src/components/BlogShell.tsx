import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock } from "lucide-react";

interface BlogShellProps {
  breadcrumb: string;
  eyebrow: string;
  title: ReactNode;
  subtitle: ReactNode;
  readMinutes: number;
  heroIcon: ReactNode;
  children: ReactNode;
  ctaTitle?: string;
  ctaCopy?: string;
  ctaLabel?: string;
  related?: ReactNode;
}

export function BlogShell({
  breadcrumb,
  eyebrow,
  title,
  subtitle,
  readMinutes,
  heroIcon,
  children,
  ctaTitle = "Start your Medora health wallet",
  ctaCopy = "Free to begin — under two minutes to your emergency-ready QR card.",
  ctaLabel = "Create my free wallet",
  related,
}: BlogShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="font-semibold">Medora</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/pricing"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Pricing
            </Link>
            <Button asChild size="sm">
              <Link to="/auth?mode=signup&next=/">
                Get started
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-8 sm:pt-12">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 text-xs uppercase tracking-wider text-muted-foreground"
        >
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>Guides</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">{breadcrumb}</span>
        </nav>

        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-accent/20 px-6 py-10 sm:px-10 sm:py-14">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" aria-hidden />
          <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-accent/30 blur-3xl" aria-hidden />
          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {heroIcon}
              <span>{eyebrow}</span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <Link to="/auth?mode=signup&next=/">
                  {ctaLabel}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {readMinutes} min read
              </span>
            </div>
          </div>
        </section>

        <article className="mt-10 space-y-10">{children}</article>

        {/* Bottom CTA */}
        <section className="mt-16 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 to-accent/20 p-8 text-center sm:p-12">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {ctaTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">{ctaCopy}</p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/auth?mode=signup&next=/">
              {ctaLabel}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </section>

        {related && (
          <section className="mt-12">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Keep reading
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">{related}</div>
          </section>
        )}
      </main>
    </div>
  );
}

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  accent?: "primary" | "success" | "warning" | "danger";
}

export function FeatureCard({ icon, title, children, accent = "primary" }: FeatureCardProps) {
  const accentMap: Record<string, string> = {
    primary: "from-primary/15 to-primary/5 text-primary border-primary/20",
    success: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 border-emerald-500/20",
    warning: "from-amber-500/15 to-amber-500/5 text-amber-600 border-amber-500/20",
    danger: "from-rose-500/15 to-rose-500/5 text-rose-600 border-rose-500/20",
  };
  return (
    <div className="group flex gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 transition-all hover:border-primary/40 hover:shadow-md">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br ${accentMap[accent]}`}
      >
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

interface StepCardProps {
  n: number;
  title: string;
  children: ReactNode;
  icon?: ReactNode;
}

export function StepCard({ n, title, children, icon }: StepCardProps) {
  return (
    <div className="relative rounded-2xl border border-border/60 bg-card/60 p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {n}
        </div>
        {icon && <div className="text-primary">{icon}</div>}
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

interface StatProps {
  value: string;
  label: string;
}
export function Stat({ value, label }: StatProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5 text-center">
      <div className="font-display text-3xl font-bold text-primary sm:text-4xl">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

interface RelatedCardProps {
  to: string;
  title: string;
  eyebrow: string;
}
export function RelatedCard({ to, title, eyebrow }: RelatedCardProps) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-2xl border border-border/60 bg-card/60 p-4 transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{eyebrow}</div>
        <div className="mt-0.5 font-semibold text-foreground">{title}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{children}</h2>
  );
}
