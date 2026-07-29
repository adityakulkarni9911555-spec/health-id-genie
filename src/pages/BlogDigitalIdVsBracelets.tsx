import { Helmet } from "react-helmet-async";
import { Check, X, ScanLine, RefreshCw, FileText, Users, Eye, DollarSign, Watch, Smartphone } from "lucide-react";
import {
  BlogShell,
  FeatureCard,
  RelatedCard,
  SectionTitle,
} from "@/components/BlogShell";

const CANONICAL = "https://medorahealthwallet.lovable.app/blog/digital-medical-id-vs-bracelets";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Digital Medical ID vs. Medical Alert Bracelet — Which Protects You Better?",
  description:
    "Compare digital medical IDs and traditional medical alert bracelets. See how each performs in emergencies, for allergies, medications, and full health records.",
  author: { "@type": "Organization", name: "Medora" },
  publisher: { "@type": "Organization", name: "Medora" },
  mainEntityOfPage: CANONICAL,
  datePublished: "2026-07-28",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is a digital medical ID better than a medical alert bracelet?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A digital medical ID can store far more than a bracelet — full allergy lists, medications, chronic conditions, emergency contacts, and uploaded documents. A bracelet only fits a few engraved lines. Many people use both: a bracelet as the visual cue, and a digital medical ID like Medora for the full record.",
      },
    },
    {
      "@type": "Question",
      name: "How does a paramedic access my digital medical ID?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "With Medora, a printable QR code on your wallet card or phone case links to a read-only, time-limited emergency page. Any clinician can scan it — no app install and no account required — and see your critical info and latest records.",
      },
    },
    {
      "@type": "Question",
      name: "Can I update a medical alert bracelet?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Engraved bracelets can't be updated without re-engraving or buying a new one. A digital medical ID updates instantly — add a new allergy or medication and it's live for the next emergency scan.",
      },
    },
  ],
};

const rows: Array<{ feature: string; bracelet: string; digital: string; digitalWins: boolean }> = [
  { feature: "Info capacity", bracelet: "4–6 lines", digital: "Unlimited + docs", digitalWins: true },
  { feature: "Update speed", bracelet: "Re-engrave", digital: "Instant", digitalWins: true },
  { feature: "Uploaded reports", bracelet: "None", digital: "PDFs, scans, labs", digitalWins: true },
  { feature: "Emergency contacts", bracelet: "One number", digital: "Multiple, with role", digitalWins: true },
  { feature: "Visible on body", bracelet: "Always", digital: "Wallet / phone case", digitalWins: false },
  { feature: "Privacy control", bracelet: "Publicly visible", digital: "Read-only, revocable", digitalWins: true },
];

export default function BlogDigitalIdVsBracelets() {
  return (
    <>
      <Helmet>
        <title>Digital Medical ID vs. Medical Alert Bracelet | Medora</title>
        <meta
          name="description"
          content="Traditional medical alert bracelets fit only a few engraved lines. A digital medical ID stores your full health record and updates instantly. Compare both here."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content="Digital Medical ID vs. Medical Alert Bracelet" />
        <meta
          property="og:description"
          content="See how digital medical IDs compare to traditional medical alert bracelets on allergies, medications, documents, and emergency access."
        />
        <meta property="og:url" content={CANONICAL} />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <BlogShell
        breadcrumb="Bracelet vs. digital ID"
        eyebrow="Compare"
        heroIcon={<ScanLine className="h-3.5 w-3.5" />}
        title="Bracelet or QR? Why not both."
        subtitle="A bracelet grabs attention. A digital medical ID carries the full picture — allergies, meds, docs, and emergency contacts, always current."
        readMinutes={2}
        related={
          <>
            <RelatedCard
              to="/blog/benefits-of-personal-health-records"
              eyebrow="Guide"
              title="Benefits of a personal health record"
            />
            <RelatedCard
              to="/blog/smartphone-emergency-medical-id-guide"
              eyebrow="How-to"
              title="Set up phone Medical ID"
            />
          </>
        }
      >
        {/* Head-to-head cards */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-border/60 bg-card/60 p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Watch className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">Medical alert bracelet</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Instantly visible</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />No battery, no signal</li>
              <li className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />Only 4–6 engraved lines</li>
              <li className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />Can't be updated</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/20 p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Smartphone className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">Digital medical ID</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Full record + documents</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Updates instantly</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Read-only & revocable</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Printable QR card</li>
            </ul>
          </div>
        </section>

        {/* Comparison table */}
        <section>
          <SectionTitle>Side by side</SectionTitle>
          <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Feature</th>
                  <th className="px-4 py-3">Bracelet</th>
                  <th className="px-4 py-3">Digital ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((r) => (
                  <tr key={r.feature}>
                    <td className="px-4 py-3 font-medium">{r.feature}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.bracelet}</td>
                    <td className={`px-4 py-3 ${r.digitalWins ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                      {r.digital}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Why doctors prefer digital */}
        <section>
          <SectionTitle>Why doctors prefer digital</SectionTitle>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <FeatureCard icon={<FileText className="h-5 w-5" />} title="Depth over a line" accent="primary">
              "Diabetic on insulin" is helpful. Exact insulin + last HbA1c changes treatment.
            </FeatureCard>
            <FeatureCard icon={<RefreshCw className="h-5 w-5" />} title="Always current" accent="success">
              Add a med tonight — it's on the emergency page tomorrow morning.
            </FeatureCard>
            <FeatureCard icon={<Users className="h-5 w-5" />} title="Multiple contacts" accent="warning">
              Spouse, primary doctor, cardiologist — one scan reaches them all.
            </FeatureCard>
            <FeatureCard icon={<Eye className="h-5 w-5" />} title="Private by design" accent="danger">
              Data only appears when scanned. Nothing stored on the clinician's phone.
            </FeatureCard>
          </div>
        </section>

        {/* Best of both worlds */}
        <section className="rounded-3xl border border-border/60 bg-card/60 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold sm:text-2xl">Wear both.</h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                A simple bracelet engraved with <strong>"Scan QR — Medora"</strong> is the visual
                flag. The QR carries everything else. Best of both worlds, one setup.
              </p>
            </div>
          </div>
        </section>
      </BlogShell>
    </>
  );
}
