import { Helmet } from "react-helmet-async";
import {
  FileSearch,
  Building2,
  PenLine,
  IdCard,
  FileDown,
  Clock,
  Scale,
  FolderCheck,
  AlertTriangle,
  Stethoscope,
  FlaskConical,
  Syringe,
} from "lucide-react";
import {
  BlogShell,
  FeatureCard,
  StepCard,
  RelatedCard,
  SectionTitle,
  Stat,
} from "@/components/BlogShell";

const CANONICAL = "https://health-id-genie.lovable.app/blog/how-to-request-medical-records";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How to Request Medical Records From Hospitals and Clinics",
  description:
    "Step-by-step guide to requesting medical records from hospitals and clinics. Learn required forms, timelines, legal rights, and how to organize records in your personal health record.",
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
      name: "How do I request my medical records from a hospital?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Contact the hospital's medical records or health information management department. Submit a written request with your full name, date of birth, contact details, dates of treatment, and the specific records you want.",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take to get medical records?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "In many countries, providers must deliver records within 30 days of a written request. Digital patient portals can provide instant access.",
      },
    },
    {
      "@type": "Question",
      name: "Can a hospital refuse to give me my medical records?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Providers can deny access only in limited cases, such as when disclosure could endanger you or others. Even then, they must provide most of the record.",
      },
    },
  ],
};

export default function BlogRequestMedicalRecords() {
  return (
    <>
      <Helmet>
        <title>How to Request Medical Records From Providers | Medora</title>
        <meta
          name="description"
          content="Request medical records from hospitals and clinics: forms, timelines, fees, legal rights, and how to organize them in your personal health record."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content="How to Request Medical Records From Providers" />
        <meta
          property="og:description"
          content="Step-by-step guide to getting your medical records: forms, timelines, legal rights, and how to keep them organized in a personal health record."
        />
        <meta property="og:url" content={CANONICAL} />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <BlogShell
        breadcrumb="Request records"
        eyebrow="How-to"
        heroIcon={<FileSearch className="h-3.5 w-3.5" />}
        title="Get every record you're owed."
        subtitle="Your history is scattered across hospitals, labs, and specialists. Here's the shortest path to collect it all — in your name, on your device."
        readMinutes={4}
        related={
          <>
            <RelatedCard
              to="/blog/benefits-of-personal-health-records"
              eyebrow="Guide"
              title="Benefits of a personal health record"
            />
            <RelatedCard
              to="/blog/digital-medical-id-vs-bracelets"
              eyebrow="Compare"
              title="Digital medical ID vs. bracelet"
            />
          </>
        }
      >
        {/* Quick stats */}
        <section className="grid grid-cols-3 gap-3">
          <Stat value="30 days" label="Legal deadline" />
          <Stat value="Free" label="Via patient portal" />
          <Stat value="You" label="Own the data" />
        </section>

        {/* What counts */}
        <section>
          <SectionTitle>What to ask for</SectionTitle>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={<Stethoscope className="h-5 w-5" />} title="Doctor notes" accent="primary">
              Consultations, discharge summaries, operative reports.
            </FeatureCard>
            <FeatureCard icon={<FlaskConical className="h-5 w-5" />} title="Labs & imaging" accent="success">
              Blood work, pathology, X-ray/CT/MRI files (DICOM).
            </FeatureCard>
            <FeatureCard icon={<Syringe className="h-5 w-5" />} title="Meds & vaccines" accent="warning">
              Prescriptions, medication lists, immunization history.
            </FeatureCard>
          </div>
        </section>

        {/* Steps */}
        <section>
          <SectionTitle>4 steps to the file</SectionTitle>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <StepCard n={1} title="Find the right office" icon={<Building2 className="h-4 w-4" />}>
              Ask for Medical Records, HIM, or Release of Information.
            </StepCard>
            <StepCard n={2} title="Submit in writing" icon={<PenLine className="h-4 w-4" />}>
              Name, DOB, dates of service, what you want, how you want it.
            </StepCard>
            <StepCard n={3} title="Verify identity" icon={<IdCard className="h-4 w-4" />}>
              Government photo ID. Include POA if requesting for a parent.
            </StepCard>
            <StepCard n={4} title="Get digital copies" icon={<FileDown className="h-4 w-4" />}>
              Always prefer PDFs. Scan any paper with a phone app.
            </StepCard>
          </div>
        </section>

        {/* Timelines + rights */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-border/60 bg-card/60 p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">Timelines & fees</h2>
            </div>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>• Up to 30 days for a written request.</li>
              <li>• One 30-day extension for complex cases.</li>
              <li>• Fees limited to copy + postage.</li>
              <li>• Patient portals = usually free & instant.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card/60 p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Scale className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">Your legal rights</h2>
            </div>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>• You have a right to your own records.</li>
              <li>• Denials must be in writing, with a reason.</li>
              <li>• Very few categories can be withheld.</li>
              <li>• File a privacy complaint if refused unfairly.</li>
            </ul>
          </div>
        </section>

        {/* After you receive */}
        <section>
          <SectionTitle>After you receive them</SectionTitle>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <FeatureCard icon={<FolderCheck className="h-5 w-5" />} title="Organize by type & date" accent="primary">
              Labs, imaging, prescriptions, discharge — folders keep it findable.
            </FeatureCard>
            <FeatureCard icon={<AlertTriangle className="h-5 w-5" />} title="Check for errors" accent="warning">
              Wrong meds or diagnoses on file can change future care. Fix them now.
            </FeatureCard>
          </div>
        </section>
      </BlogShell>
    </>
  );
}
