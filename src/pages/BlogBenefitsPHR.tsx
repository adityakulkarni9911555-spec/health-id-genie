import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

const CANONICAL = "https://health-id-genie.lovable.app/blog/benefits-of-personal-health-records";

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

      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 bg-background/70 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-2">
              <Logo className="h-8 w-8" />
              <span className="font-semibold">Medora</span>
            </Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-6 py-12">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <span className="mx-2">/</span>
            <span>Blog</span>
            <span className="mx-2">/</span>
            <span className="text-foreground">Benefits of a personal health record</span>
          </nav>

          <article className="prose prose-slate max-w-none dark:prose-invert">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Benefits of a Personal Health Record — Why Every Family Needs One
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              A personal health record (PHR) puts your medical history, allergies, medications, and
              key documents in one place you control — ready for emergencies, doctor visits, and
              day-to-day care.
            </p>

            <h2>What is a personal health record?</h2>
            <p>
              A personal health record is a digital, patient-owned file of your health information.
              Unlike a hospital's electronic medical record, a PHR follows <em>you</em> across
              clinics, cities, and specialists. It typically includes your blood group, allergies,
              chronic conditions, current medications, vaccination history, past reports, and an
              emergency contact.
            </p>

            <h2>1. Emergency readiness that can save a life</h2>
            <p>
              In a road accident, allergic reaction, or sudden cardiac event, minutes matter. If
              you're unconscious, paramedics have to guess your blood group, drug allergies, and
              existing conditions. A PHR with a secure emergency QR code lets a clinician scan and
              instantly see:
            </p>
            <ul>
              <li>Blood group and known drug allergies</li>
              <li>Chronic conditions like diabetes, epilepsy, or heart disease</li>
              <li>Current medications and dosages</li>
              <li>Emergency contact and treating doctor</li>
            </ul>
            <p>
              Leading health authorities including{" "}
              <a href="https://www.mayoclinic.org/" target="_blank" rel="noopener noreferrer">
                Mayo Clinic
              </a>{" "}
              recommend keeping this information accessible at all times.
            </p>

            <h2>2. Track allergies and medications without slip-ups</h2>
            <p>
              Adverse drug reactions are one of the most common preventable medical errors. A PHR
              lets you record every allergy — antibiotics, painkillers, foods, latex — so any
              prescribing doctor sees the full list before writing a new script. Medication
              tracking also helps flag dangerous interactions when you visit a new specialist.
            </p>

            <h2>3. Faster, better doctor visits</h2>
            <p>
              How often have you struggled to remember when a symptom started, what a previous
              doctor prescribed, or which lab did last year's test? A PHR turns a fifteen-minute
              consultation into a productive one. Share prior reports, imaging, and prescriptions
              in one tap — no more digging through WhatsApp forwards or paper folders.
            </p>

            <h2>4. Better care for kids, parents, and dependents</h2>
            <p>
              A family health record is especially valuable for children's vaccination schedules
              and for elderly parents managing multiple prescriptions. Instead of separate folders
              per person, one shared wallet keeps everyone's information current and accessible to
              the caregivers who need it.
            </p>

            <h2>5. You own your data</h2>
            <p>
              Hospital records live in the hospital's system. A personal health record lives with
              you. You choose what to store, who can view it, and when to revoke access.
              Medora's emergency access, for example, is read-only, time-limited, and shows only
              the fields you've marked safe to share — never the full document library.
            </p>

            <h2>How to start your personal health record</h2>
            <ol>
              <li>Create an account and add your basic profile — name, blood group, age.</li>
              <li>List your allergies, chronic conditions, and current medications.</li>
              <li>Upload key documents: recent prescriptions, discharge summaries, lab reports.</li>
              <li>Set an emergency contact and generate your emergency QR code.</li>
              <li>Print or save the QR code in your wallet, phone case, or car glovebox.</li>
            </ol>

            <div className="mt-10 rounded-2xl border border-border bg-muted/30 p-6">
              <h3 className="mt-0 text-xl font-semibold">Start your Medora health wallet</h3>
              <p className="mb-4 text-muted-foreground">
                Free to begin — no card required. Add your details in under two minutes and get an
                emergency QR code you can share with any doctor.
              </p>
              <Link
                to="/auth"
                className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Create my health record
              </Link>
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
              Related reading:{" "}
              <Link to="/blog/digital-medical-id-vs-bracelets" className="underline">
                Digital medical ID vs. bracelets
              </Link>{" "}
              and{" "}
              <Link to="/blog/how-to-request-medical-records" className="underline">
                How to request medical records
              </Link>
              .
            </p>
          </article>
        </main>
      </div>
    </>
  );
}
