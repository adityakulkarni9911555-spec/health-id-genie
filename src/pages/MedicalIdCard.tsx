import { Helmet } from "react-helmet-async";
import {
  QrCode,
  Printer,
  Siren,
  Shield,
  Smartphone,
  FileText,
  UserPlus,
  ListChecks,
  Upload,
  Download,
} from "lucide-react";
import {
  BlogShell,
  FeatureCard,
  StepCard,
  Stat,
  RelatedCard,
  SectionTitle,
} from "@/components/BlogShell";

const CANONICAL = "https://medorahealthwallet.lovable.app/medical-id-card";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Free Medical ID Card with QR Code — Create, Print, and Share Instantly",
  description:
    "Create a free digital medical ID card with a printable QR code. Keep emergency info, allergies, blood group, and contacts ready for paramedics and doctors.",
  author: { "@type": "Organization", name: "Medora" },
  publisher: { "@type": "Organization", name: "Medora" },
  mainEntityOfPage: CANONICAL,
  datePublished: "2026-09-13",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a medical ID card?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A medical ID card is a wallet-sized card or digital profile that carries your critical health information — blood group, allergies, chronic conditions, medications, emergency contacts, and documents — so first responders and doctors can help you faster in an emergency.",
      },
    },
    {
      "@type": "Question",
      name: "How do I create a free medical ID card online?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "With Medora, sign up in under two minutes, add your health details, and generate a printable medical ID card with a QR code. The card links to a read-only emergency page that updates whenever you edit your record.",
      },
    },
    {
      "@type": "Question",
      name: "Can I print the medical ID card at home?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Medora formats your card as a PDF you can print on any A4 or letter printer and keep in your wallet, phone case, or glove box.",
      },
    },
    {
      "@type": "Question",
      name: "Is the QR code on the medical ID card secure?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The QR code opens a read-only, time-limited emergency page that only shows the fields you mark as safe to share. It does not expose your full document library or any data you keep private.",
      },
    },
  ],
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Medora Medical ID Card",
  applicationCategory: "HealthApplication",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    description: "Free medical ID card with QR code",
  },
  operatingSystem: "Web, iOS, Android",
  url: CANONICAL,
};

export default function MedicalIdCard() {
  return (
    <>
      <Helmet>
        <title>Free Medical ID Card with QR Code | Medora</title>
        <meta
          name="description"
          content="Create a free medical ID card online. Add allergies, blood group, medications, and emergency contacts. Print a wallet card with a scannable QR code for paramedics."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content="Free Medical ID Card with QR Code | Medora" />
        <meta
          property="og:description"
          content="Create and print a free medical ID card. Paramedics scan the QR code for your allergies, blood group, conditions, and contacts."
        />
        <meta property="og:url" content={CANONICAL} />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(productSchema)}</script>
      </Helmet>

      <BlogShell
        breadcrumb="Medical ID card"
        eyebrow="Free tool"
        heroIcon={<QrCode className="h-3.5 w-3.5" />}
        title="Your free medical ID card, always with you."
        subtitle="Create a printable medical ID card with a QR code. Add allergies, blood group, medications, and emergency contacts so first responders can act fast."
        readMinutes={3}
        ctaTitle="Create your free medical ID card"
        ctaCopy="No payment required. Build your card in under two minutes and keep it in your wallet, phone, or glove box."
        ctaLabel="Create free ID card"
        related={
          <>
            <RelatedCard
              to="/blog/digital-medical-id-vs-bracelets"
              eyebrow="Compare"
              title="Digital medical ID vs. bracelet"
            />
            <RelatedCard
              to="/blog/benefits-of-personal-health-records"
              eyebrow="Guide"
              title="Benefits of a personal health record"
            />
          </>
        }
      >
        {/* Stats strip */}
        <section className="grid grid-cols-3 gap-3">
          <Stat value="2 min" label="Setup" />
          <Stat value="Free" label="ID card" />
          <Stat value="24/7" label="Emergency access" />
        </section>

        {/* What makes it useful */}
        <section>
          <SectionTitle>Why carry a medical ID card?</SectionTitle>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <FeatureCard
              icon={<Siren className="h-5 w-5" />}
              title="Faster emergency care"
              accent="danger"
            >
              Paramedics scan your card and instantly see blood group, allergies,
              conditions, and emergency contacts — even if you can't speak.
            </FeatureCard>
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Avoid dangerous mistakes"
              accent="warning"
            >
              Clear allergy and medication notes help doctors avoid treatments
              that could harm you.
            </FeatureCard>
            <FeatureCard
              icon={<Printer className="h-5 w-5" />}
              title="Printable wallet card"
              accent="primary"
            >
              Generate a PDF formatted for standard wallet size. Laminate it or
              keep it behind your phone case.
            </FeatureCard>
            <FeatureCard
              icon={<Smartphone className="h-5 w-5" />}
              title="Digital + physical"
              accent="success"
            >
              Your QR card works alongside the app. Update your record anytime;
              the next scan shows the latest info.
            </FeatureCard>
          </div>
        </section>

        {/* QR preview description card */}
        <section className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-accent/20">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="p-6 sm:p-8">
              <h2 className="font-display text-xl font-bold sm:text-2xl">
                One QR code, your full emergency picture
              </h2>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                The printable Medora card shows your name, blood group, and a
                scannable QR code. When someone scans it, they see a clean,
                read-only emergency page with the details you choose to share.
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="text-emerald-600">✓</span>
                  No app install needed for the scanner
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600">✓</span>
                  Works offline once the page is loaded
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600">✓</span>
                  You control what is visible on the card
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600">✓</span>
                  Update anytime; scans always show current data
                </li>
              </ul>
            </div>
            <div className="flex items-center justify-center border-t border-border/60 bg-card/60 p-6 sm:p-8 md:border-t-0 md:border-l">
              <div className="relative w-full max-w-[280px] overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary to-accent" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Emergency ID
                  </span>
                  <div className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Medora
                  </div>
                </div>
                <div className="mt-4 flex justify-center">
                  <div className="flex h-28 w-28 items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
                    <QrCode className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <div className="mt-4 space-y-1 text-center text-sm">
                  <p className="font-semibold">Your Name</p>
                  <p className="text-muted-foreground">Blood group: B+</p>
                </div>
                <p className="mt-3 text-center text-[10px] text-muted-foreground">
                  Scan for allergies, conditions & contacts
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How to create */}
        <section>
          <SectionTitle>Create your medical ID card in 4 steps</SectionTitle>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <StepCard n={1} title="Sign up free" icon={<UserPlus className="h-4 w-4" />}>
              Create a Medora account with your email and a secure password.
            </StepCard>
            <StepCard n={2} title="Add your basics" icon={<ListChecks className="h-4 w-4" />}>
              Enter blood group, allergies, conditions, medications, and
              emergency contacts.
            </StepCard>
            <StepCard n={3} title="Upload documents" icon={<Upload className="h-4 w-4" />}>
              Optional: attach prescriptions, lab reports, or discharge notes
              for doctor visits.
            </StepCard>
            <StepCard n={4} title="Print your card" icon={<Download className="h-4 w-4" />}>
              Download your medical ID card as a PDF and print it from any
              computer.
            </StepCard>
          </div>
        </section>

        {/* Privacy callout */}
        <section className="rounded-3xl border border-border/60 bg-card/60 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold sm:text-2xl">
                You choose what to share
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Your uploaded documents are private and only visible to you. The
                medical ID card QR code reveals only the emergency details you
                mark as safe to share. Access is read-only, time-limited, and
                revocable.
              </p>
            </div>
          </div>
        </section>
      </BlogShell>
    </>
  );
}
