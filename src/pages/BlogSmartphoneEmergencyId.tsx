import { Helmet } from "react-helmet-async";
import {
  Smartphone,
  HeartPulse,
  Settings,
  ShieldPlus,
  Lock,
  FileUp,
  QrCode,
  Timer,
} from "lucide-react";
import {
  BlogShell,
  StepCard,
  FeatureCard,
  RelatedCard,
  SectionTitle,
} from "@/components/BlogShell";

const CANONICAL =
  "https://health-id-genie.lovable.app/blog/smartphone-emergency-medical-id-guide";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How to Set Up Emergency Medical ID on iPhone and Android",
  description:
    "Step-by-step guide to enabling the native Medical ID on iPhone and Emergency Information on Android, plus how Medora adds a QR-accessible health record.",
  author: { "@type": "Organization", name: "Medora" },
  publisher: { "@type": "Organization", name: "Medora" },
  mainEntityOfPage: CANONICAL,
  datePublished: "2026-07-28",
};

export default function BlogSmartphoneEmergencyId() {
  return (
    <>
      <Helmet>
        <title>Set Up Emergency Medical ID on iPhone & Android | Medora</title>
        <meta
          name="description"
          content="Enable Medical ID on iPhone and Emergency Info on Android in minutes. Plus how Medora adds a QR-accessible personal health record for doctors."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:type" content="article" />
        <meta
          property="og:title"
          content="Set Up Emergency Medical ID on iPhone and Android"
        />
        <meta
          property="og:description"
          content="Turn on native Medical ID on your phone and pair it with a QR-accessible personal health record."
        />
        <meta property="og:url" content={CANONICAL} />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      </Helmet>

      <BlogShell
        breadcrumb="Phone Medical ID"
        eyebrow="How-to"
        heroIcon={<Smartphone className="h-3.5 w-3.5" />}
        title="Turn your phone into a medical ID."
        subtitle="5 minutes on iPhone or Android — critical info that first responders see from the lock screen."
        readMinutes={2}
        related={
          <>
            <RelatedCard
              to="/blog/digital-medical-id-vs-bracelets"
              eyebrow="Compare"
              title="Digital ID vs. bracelet"
            />
            <RelatedCard
              to="/blog/benefits-of-personal-health-records"
              eyebrow="Guide"
              title="Benefits of a personal health record"
            />
          </>
        }
      >
        {/* Two-side setup */}
        <section className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-3xl border border-border/60 bg-card/60 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HeartPulse className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">iPhone — Health app</h2>
            </div>
            <ol className="space-y-2.5 text-sm">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">1</span>
                Open <strong>Health</strong> → tap your profile.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">2</span>
                Tap <strong>Medical ID</strong> → <strong>Edit</strong>.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">3</span>
                Add allergies, meds, conditions, blood type.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">4</span>
                Turn on <strong>Show When Locked</strong> + <strong>Share During Emergency Call</strong>.
              </li>
            </ol>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card/60 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Settings className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">Android — Safety & emergency</h2>
            </div>
            <ol className="space-y-2.5 text-sm">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-600">1</span>
                <strong>Settings</strong> → <strong>Safety & emergency</strong>.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-600">2</span>
                Tap <strong>Medical information</strong>, fill it in.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-600">3</span>
                Add <strong>Emergency contacts</strong>.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-600">4</span>
                Lock screen → swipe up → <strong>Emergency</strong>.
              </li>
            </ol>
          </div>
        </section>

        {/* Where phone ID falls short */}
        <section>
          <SectionTitle>Where Medora picks up</SectionTitle>
          <p className="mt-2 text-muted-foreground">
            Native Medical ID is a summary. Doctors also need documents.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <FeatureCard icon={<FileUp className="h-5 w-5" />} title="Real documents" accent="primary">
              Upload prescriptions, imaging, discharge notes — not just a text summary.
            </FeatureCard>
            <FeatureCard icon={<QrCode className="h-5 w-5" />} title="Scan-anywhere QR" accent="success">
              Any camera app scans it. No app install, no login for the clinician.
            </FeatureCard>
            <FeatureCard icon={<Timer className="h-5 w-5" />} title="Always current" accent="warning">
              QR resolves to your latest record — even the card you printed a year ago.
            </FeatureCard>
            <FeatureCard icon={<Lock className="h-5 w-5" />} title="Zero footprint" accent="danger">
              When the clinician closes the tab, nothing persists on their device.
            </FeatureCard>
          </div>
        </section>

        {/* Pair-it-up callout */}
        <section className="rounded-3xl border border-border/60 bg-card/60 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldPlus className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold sm:text-2xl">Use both.</h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Phone Medical ID for the 3-second summary. Medora QR for the full record.
                Together, first responders get everything they need — in the order they need it.
              </p>
            </div>
          </div>
        </section>
      </BlogShell>
    </>
  );
}
