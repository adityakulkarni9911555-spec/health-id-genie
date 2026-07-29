import { Helmet } from "react-helmet-async";
import {
  Siren,
  PillBottle,
  Stethoscope,
  Users,
  Lock,
  Heart,
  UserPlus,
  ListChecks,
  FileUp,
  QrCode,
} from "lucide-react";
import {
  BlogShell,
  FeatureCard,
  StepCard,
  Stat,
  RelatedCard,
  SectionTitle,
} from "@/components/BlogShell";

const CANONICAL = "https://medorahealthwallet.lovable.app/blog/benefits-of-personal-health-records";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Benefits of a Personal Health Record — Why Every Family Needs One",
  description:
    "A personal health record (PHR) keeps allergies, medications, conditions, and documents ready for emergencies and doctor visits. Learn the benefits and how to start.",
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
      name: "What is a personal health record (PHR)?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A personal health record is a digital file that you own and control, containing your medical history, allergies, medications, conditions, and important documents like prescriptions and reports.",
      },
    },
    {
      "@type": "Question",
      name: "How is a PHR useful in an emergency?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "In an emergency, first responders and doctors can scan a secure QR code or link to instantly see your blood group, allergies, chronic conditions, and emergency contact — even if you're unconscious.",
      },
    },
    {
      "@type": "Question",
      name: "Is my personal health record private?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "With Medora, only you can see your uploaded documents. Emergency access is time-limited, read-only, and reveals just the fields you've marked as safe to share.",
      },
    },
  ],
};

export default function BlogBenefitsPHR() {
  return (
    <>
      <Helmet>
        <title>Benefits of a Personal Health Record | Medora</title>
        <meta
          name="description"
          content="Why a personal health record matters: emergency readiness, allergy and medication tracking, and faster doctor visits. A practical guide from Medora."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content="Benefits of a Personal Health Record" />
        <meta
          property="og:description"
          content="Emergency readiness, allergy tracking, and smoother doctor visits — the case for keeping your health record with you."
        />
        <meta property="og:url" content={CANONICAL} />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <BlogShell
        breadcrumb="Personal health record"
        eyebrow="Guide"
        heroIcon={<Heart className="h-3.5 w-3.5" />}
        title="Your health, always with you."
        subtitle="A personal health record puts your allergies, meds, and documents in one place — ready for emergencies, doctor visits, and everyday care."
        readMinutes={3}
        related={
          <>
            <RelatedCard
              to="/blog/digital-medical-id-vs-bracelets"
              eyebrow="Compare"
              title="Digital medical ID vs. bracelet"
            />
            <RelatedCard
              to="/blog/how-to-request-medical-records"
              eyebrow="How-to"
              title="Request records from providers"
            />
          </>
        }
      >
        {/* Stats strip */}
        <section className="grid grid-cols-3 gap-3">
          <Stat value="2 min" label="Setup" />
          <Stat value="0" label="Paperwork" />
          <Stat value="24/7" label="Access" />
        </section>

        {/* Why it matters */}
        <section>
          <SectionTitle>Why it matters</SectionTitle>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <FeatureCard
              icon={<Siren className="h-5 w-5" />}
              title="Emergency ready"
              accent="danger"
            >
              Paramedics scan one QR and see your blood group, allergies, and
              conditions — even if you can't speak.
            </FeatureCard>
            <FeatureCard
              icon={<PillBottle className="h-5 w-5" />}
              title="No medication mix-ups"
              accent="warning"
            >
              Every allergy and current med, on hand for any new prescriber.
              Fewer interactions, fewer mistakes.
            </FeatureCard>
            <FeatureCard
              icon={<Stethoscope className="h-5 w-5" />}
              title="Faster doctor visits"
              accent="primary"
            >
              Share prior reports and prescriptions in one tap — no more digging
              through WhatsApp or paper folders.
            </FeatureCard>
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Family friendly"
              accent="success"
            >
              One place for kids' vaccines, parents' prescriptions, and
              everyone's emergency info.
            </FeatureCard>
          </div>
        </section>

        {/* Privacy callout */}
        <section className="rounded-3xl border border-border/60 bg-card/60 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold sm:text-2xl">
                You own the data
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Hospital records live in the hospital. Your PHR lives with you.
                Choose what to store, who sees it, and when. Emergency access is
                read-only, time-limited, and revocable.
              </p>
            </div>
          </div>
        </section>

        {/* How to start */}
        <section>
          <SectionTitle>Start in 4 steps</SectionTitle>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <StepCard n={1} title="Create account" icon={<UserPlus className="h-4 w-4" />}>
              Add name, blood group, age — 30 seconds.
            </StepCard>
            <StepCard n={2} title="List essentials" icon={<ListChecks className="h-4 w-4" />}>
              Allergies, chronic conditions, current meds.
            </StepCard>
            <StepCard n={3} title="Upload docs" icon={<FileUp className="h-4 w-4" />}>
              Prescriptions, discharge notes, lab reports.
            </StepCard>
            <StepCard n={4} title="Print your QR" icon={<QrCode className="h-4 w-4" />}>
              Keep it in your wallet, phone case, or glovebox.
            </StepCard>
          </div>
        </section>
      </BlogShell>
    </>
  );
}
