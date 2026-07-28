import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

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
        text: "Contact the hospital's medical records or health information management department. Submit a written request with your full name, date of birth, contact details, dates of treatment, and the specific records you want. Most hospitals provide forms online or at the front desk.",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take to get medical records?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "In many countries, providers must deliver records within 30 days of a written request. Urgent requests may be processed faster. Digital patient portals can provide instant access to lab results and visit summaries.",
      },
    },
    {
      "@type": "Question",
      name: "Can a hospital refuse to give me my medical records?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Providers can deny access only in limited cases, such as when disclosure could endanger you or others. Even then, they must provide most of the record and explain any redactions in writing.",
      },
    },
    {
      "@type": "Question",
      name: "What should I do with my medical records once I receive them?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Organize them by date and type — prescriptions, lab reports, imaging, discharge summaries — then upload them to a secure personal health record like Medora so they are searchable and available in emergencies.",
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
            <span className="text-foreground">How to request medical records</span>
          </nav>

          <article className="prose prose-slate max-w-none dark:prose-invert">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How to Request Medical Records From Hospitals and Clinics
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Building a personal health record starts with collecting your existing medical
              documents. This guide walks you through requesting records from hospitals, clinics,
              labs, and imaging centers — including the forms you need, your legal rights, typical
              timelines, and what to do once the files arrive.
            </p>

            <h2>Why request your medical records?</h2>
            <p>
              Your medical history is scattered across every provider you've ever visited. When you
              move cities, switch doctors, or land in an emergency room, those disconnected records
              can delay diagnosis and treatment. A complete personal health record helps you:
            </p>
            <ul>
              <li>Share accurate medication and allergy lists with new doctors</li>
              <li>Avoid repeated tests and scans</li>
              <li>Track chronic conditions over time</li>
              <li>Give emergency responders the information they need most</li>
            </ul>

            <h2>What counts as a medical record?</h2>
            <p>
              Medical records include more than just doctor's notes. When you request records, ask
              for everything relevant to your care:
            </p>
            <ul>
              <li>Discharge summaries and operative reports</li>
              <li>Lab results and pathology reports</li>
              <li>Imaging reports and actual scan files (X-rays, CT, MRI, ultrasound)</li>
              <li>Prescriptions and medication lists</li>
              <li>Vaccination records</li>
              <li>Consultation notes from specialists</li>
              <li>Allergy and adverse-reaction history</li>
            </ul>

            <h2>Step-by-step: how to request your records</h2>

            <h3>1. Identify the right department</h3>
            <p>
              Most hospitals have a Medical Records, Health Information Management (HIM), or
              Release of Information office. For smaller clinics, the front desk or your doctor's
              office manager usually handles requests. Call ahead and ask:
            </p>
            <ul>
              <li>Do you have an online patient portal?</li>
              <li>Is there a specific medical records release form?</li>
              <li>What identification do I need to provide?</li>
              <li>Are there fees for printed or digital copies?</li>
            </ul>

            <h3>2. Submit a written request</h3>
            <p>
              A phone call is rarely enough. Submit a signed, written request — either the
              provider's own form or a formal letter. Include:
            </p>
            <ul>
              <li>Your full legal name and any former names</li>
              <li>Date of birth and contact information</li>
              <li>Dates of service or treatment</li>
              <li>The specific records you want</li>
              <li>How you want to receive them: portal download, email, CD, or printed copy</li>
              <li>Your signature and the date</li>
            </ul>

            <h3>3. Verify your identity</h3>
            <p>
              Providers must confirm you are the patient or a legal representative. Be ready to
              submit a government-issued photo ID. If you're requesting records for a child, elderly
              parent, or someone you have power of attorney for, include legal documentation of your
              authority.
            </p>

            <h3>4. Specify the format</h3>
            <p>
              Whenever possible, ask for digital copies. PDFs and DICOM imaging files are easier to
              store, search, and share. If the provider only offers paper, scan the pages into a
              high-quality PDF using a phone scanner app so you can upload them to your personal
              health record.
            </p>

            <h2>Typical timelines and fees</h2>
            <p>
              Many regions require providers to fulfill record requests within 30 days. Some allow
              a single 30-day extension if the request is complex. Fees should be reasonable and
              limited to copying and postage. If you can download records through a patient portal,
              there is usually no charge.
            </p>

            <h2>Your legal rights</h2>
            <p>
              In most countries, patients have a legal right to access their own health
              information. Providers may withhold only specific, limited categories — such as
              psychotherapy notes or information that could reasonably endanger you or another
              person. If your request is denied, ask for the reason in writing and consider filing
              a complaint with the relevant national or regional health privacy authority.
            </p>

            <h2>What to do after you receive your records</h2>
            <ol>
              <li>
                <strong>Organize by category and date.</strong> Group documents into folders for
                labs, imaging, prescriptions, discharge summaries, and vaccinations.
              </li>
              <li>
                <strong>Review for accuracy.</strong> Check that names, dates, diagnoses, and
                medications are correct. Errors in medical records can affect future care.
              </li>
              <li>
                <strong>Upload to a secure personal health record.</strong> Store everything in one
                encrypted, backed-up location that you control.
              </li>
              <li>
                <strong>Update your emergency summary.</strong> Make sure your blood group,
                allergies, conditions, and emergency contact reflect your latest records.
              </li>
            </ol>

            <h2>How Medora helps</h2>
            <p>
              Medora turns scattered PDFs and reports into a searchable, always-available personal
              health record. Upload prescriptions, lab reports, and imaging files, then generate a
              secure emergency QR code that clinicians can scan in seconds. Your documents stay
              private and owner-only — emergency access is read-only and time-limited.
            </p>

            <div className="mt-10 rounded-2xl border border-border bg-muted/30 p-6">
              <h3 className="mt-0 text-xl font-semibold">Start your personal health record</h3>
              <p className="mb-4 text-muted-foreground">
                Free to begin. Collect your records once, keep them organized forever, and share
                safely with any doctor in an emergency.
              </p>
              <Link
                to="/auth?mode=signup&next=/"
                className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Create my health record
              </Link>
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
              Related reading:{" "}
              <Link to="/blog/benefits-of-personal-health-records" className="underline">
                Benefits of a personal health record
              </Link>{" "}
              and{" "}
              <Link to="/blog/digital-medical-id-vs-bracelets" className="underline">
                Digital medical ID vs. medical alert bracelet
              </Link>
              .
            </p>
          </article>
        </main>
      </div>
    </>
  );
}
