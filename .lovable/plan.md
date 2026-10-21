# Build a test Android APK for Medora

## Goal
Produce an installable test APK (debug build) of Medora and save it to Files, so you can sideload it on an Android phone.

## What you get
- `medora-debug.apk` in Files. On a phone: download it, allow "Install unknown apps", tap to install.
- The app opens the live published Medora site (https://medorahealthwallet.lovable.app) inside a native shell, so it always shows your latest published version — no rebuild needed for normal updates.
- App name "Medora", Medora icon, purple status bar.

## Limits (stated upfront)
- Debug/test APK only: not signed for the Play Store. A Play Store release needs your own signing key, which you would create and keep yourself.
- Needs internet on first open (same as the website).
- The build tools are large; if the sandbox cannot finish the build (time/disk limits), I will stop, tell you exactly where it failed, and leave the Android project ready for you to build in Android Studio.

## Steps
1. Add Capacitor to the project (core, cli, android) and a config file: app id `app.lovable.p0392aa24616c429abf3db6add5225e03`, name `Medora`, pointing at the published site.
2. Generate the Android project and the app icon from the existing Medora logo.
3. In a temporary build folder: install a Java JDK 17 and the Android command-line SDK (platform + build-tools), then run the Gradle debug build.
4. Copy the resulting APK to Files as `medora-debug.apk` and check it with `aapt` (package name, version, app label).
5. Record the Capacitor decision in AGENTS.md and the task in roadmap.md.

## Technical details
- Packages: `@capacitor/core`, `@capacitor/android`, dev `@capacitor/cli`.
- `capacitor.config.ts`: `webDir: 'dist'`, `server.url` = published URL (no `cleartext`), `androidScheme: 'https'`.
- Build runs under /tmp (SDK, Gradle cache) to keep the project clean; only `android/` source and config are kept in the project, with `android/build` and SDK paths ignored.
- No backend, data, or security changes. Emergency page, PIN gating and auto-wipe behave exactly as on the website.
