# Smart Health ID

Prompt: Smart Health Card – Patient Registration App

Build a tablet-friendly, light-themed registration web/mobile app for clinic receptionists or patients to register new users into a smart health card system. The app should:

🧾 Patient Registration

Capture personal details:

Full name, date of birth, phone number, gender

Blood group, height, weight

Known allergies and chronic conditions (diabetes, asthma, etc.)

Emergency contact number

Optional insurance details (policy number, provider, TPA contact)

Perform input validation:

Required fields (name, phone, DOB)

Prevent duplicates by checking phone number or Aadhaar (if used)

🆔 Profile Creation + ID

On submit, generate a unique patient ID (UUID or ABHA-compatible)

Save patient profile securely to a shared cloud database (e.g. Firebase or Supabase)

Auto-generate a QR code representing the patient ID

Display the QR code with patient name and DOB for printing

Optional: Write the same ID to an NFC tag (tap-to-write flow if Android device supports it)

🖨️ Card Generation (Lightweight)

Display a card preview on screen with:

Patient name

QR code

Blood group and emergency number

Option to download or print as card

🔁 Sync with Doctor App

Ensure all registration data is saved in a shared collection

Doctor App can scan QR/NFC and retrieve patient data instantly

No further manual steps needed on doctor side

🧩 Additional Requirements

Support offline-first mode (e.g., data saved locally and syncs when online)

Use simple, large tap targets and big inputs (for tablet or touchscreen use)

Allow admin/staff to edit profile if needed (with permission logs)

Secure form access via login PIN or staff badge (optional)

📱 Tech Stack Suggestions:

Frontend: React, Flutter or React Native with Tailwind (light theme)

QR: Use open QR libraries (qrcode.react, qrcode-svg)

NFC (optional): Web NFC API or native plugin (for Android-only)

Backend: Firebase Firestore, Supabase DB, or RESTful API

Print-ready card component with export to PDF

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://health-id-genie.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0392aa24-616c-429a-bf3d-b6add5225e03).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
