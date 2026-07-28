import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

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

      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 bg-background/70 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-2">
              <Logo className="h-8 w-8" />
              <span className="font-semibold">Medora</span>
            </Link>
            <Link
              to="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Pricing
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-6 py-12">
          <article className="prose prose-slate dark:prose-invert max-w-none">
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              How to set up emergency Medical ID on iPhone and Android
            </h1>
            <p className="text-muted-foreground mt-2">
              A 5-minute setup that could help first responders make faster,
              safer decisions in an emergency.
            </p>

            <h2 className="mt-8">Why smartphone Medical ID matters</h2>
            <p>
              Both iPhone and Android let first responders view critical health
              info from the lock screen — without unlocking your phone. Setting
              this up takes minutes and works even when you can't speak for
              yourself.
            </p>

            <h2 className="mt-8">iPhone: enable Medical ID in the Health app</h2>
            <ol>
              <li>Open the <strong>Health</strong> app.</li>
              <li>Tap your profile picture in the top right.</li>
              <li>Select <strong>Medical ID</strong>, then <strong>Edit</strong>.</li>
              <li>
                Add allergies, medications, conditions, blood type, and
                emergency contacts.
              </li>
              <li>
                Turn on <strong>Show When Locked</strong> and{" "}
                <strong>Share During Emergency Call</strong>.
              </li>
              <li>Tap <strong>Done</strong>.</li>
            </ol>

            <h2 className="mt-8">Android: enable Emergency Information</h2>
            <ol>
              <li>Open <strong>Settings</strong> → <strong>Safety &amp; emergency</strong> (or Personal Safety on Pixel).</li>
              <li>Tap <strong>Medical information</strong> and fill in details.</li>
              <li>Under <strong>Emergency contacts</strong>, add trusted people.</li>
              <li>
                From the lock screen, responders can swipe up and tap{" "}
                <strong>Emergency</strong> → <strong>Medical information</strong>.
              </li>
            </ol>

            <h2 className="mt-8">How Medora complements native Medical ID</h2>
            <p>
              Native Medical ID is great for a quick summary, but it can't hold
              lab reports, prescriptions, imaging, or a full medical history.
              Medora gives you a QR-accessible personal health record that
              doctors can scan to see current documents, allergies, and
              emergency contacts — always up to date, no matter when you
              printed your card.
            </p>

            <ul>
              <li>Upload PDFs, images, and prescriptions in one place</li>
              <li>Share a QR that always resolves to your latest records</li>
              <li>Zero data persistence on the clinician view once closed</li>
            </ul>

            <div className="mt-10 rounded-2xl border border-border bg-card p-6">
              <h2 className="text-xl font-semibold mb-2">
                Set up your Medora health wallet in 60 seconds
              </h2>
              <p className="text-muted-foreground mb-4">
                Pair your phone's Medical ID with a QR-accessible personal
                health record.
              </p>
              <Button asChild size="lg">
                <Link to="/auth">Get started free</Link>
              </Button>
            </div>
          </article>
        </main>
      </div>
    </>
  );
}
