# Chotu: demo build instructions

Competition demo (presentation on 17 Oct 2026). Goal: a reliable, good-looking clickable prototype that proves the idea to judges. Polish and a stable live demo matter more than completeness. The builder (Mehtaj) has no coding experience: explain what you are doing in plain language, give exact steps for anything she must do herself, and fix errors yourself when she pastes them.

## What Chotu is
A Bangla-first, voice-driven AI care companion for older adults (60+) in Bangladesh. One app, two interfaces:
- **Elder interface:** voice, big buttons, no typing, no menus.
- **Caregiver interface:** setup, alerts, dashboard.
Each elder has their own phone and their own profile. One caregiver account can look after two elders (Baba and Ma). The primary caregiver is the Admin who verifies and activates schedules.

## How the demo works
- React + Vite single page. Two phone-sized frames side by side (Elder phone | Caregiver phone) sharing one in-memory state, saved to localStorage. A top bar has a switch for which elder is shown, plus a **demo clock** (+10 min, +30 min, +1 hour, Reset demo that restores seed data).
- No backend and no API keys in the core build. The page must work offline.
- Mobile-friendly, Bangla-friendly fonts (Noto Sans Bengali), large touch targets, high contrast.

## Setup: by hand, or from a prescription photo (added 16 Oct at the user's request)
Add medicine by name with autocomplete from the medicine library (name + packet image) -> confirm the image (if missing, upload a packet photo) -> schedule builder with big buttons: morning / noon / night, before or after meal, duration (days / weeks / ongoing), and an "as needed" switch showing minimum hours between doses and maximum per day -> optional attached prescription photo shown beside the schedule -> one-screen summary -> "Verify and activate" (primary caregiver only). Meal and sleep times live on each elder profile and turn "after breakfast" into clock times.
Prescription photo (printed prescriptions only): Gemini reads only the Rx lines (api/prescription.js), rules in src/lib/rx.js match them to the library and flag doubts (different strength = no library photo, already on the list, weekly doses, missing meal or gap). The family checks every line; the primary caregiver still verifies and activates.

## Safety rules (never break these)
- Nothing goes live without primary caregiver verification.
- "মনে নেই" never tells the elder to take the medicine. It tells them to wait and alerts caregivers with the last dose and time.
- As-needed medicines have no scheduled reminder. Logging checks the min gap and daily max; if exceeded, still log it but alert caregivers.
- Double entries for one dose slot show as a conflict with who entered each.
- Elder replies: খেয়েছি, এখনও খাইনি, মনে নেই, সাহায্য চাই.
- Emergency: big always-visible button on the elder screen, 5-second countdown with a large Cancel, then alerts all caregivers of that elder, naming and showing the elder, with a Call 999 button.
- No medical advice or diagnosis anywhere. Medicine info shown is only what the caregiver entered.
- Every alert shows the elder's photo and name.

## Alert logic (uses the demo clock)
No response: repeat reminder at +10 and +20 min; at +30 min alert the first caregiver in the alert order. "I'm handling this" stops it for others; no acknowledgement after 10 more minutes goes to the next caregiver, then everyone. A "phone unreachable" demo toggle changes the wording from "missed dose".

## Build stages (do one at a time; I run it and look before moving on; commit after each)
1. Skeleton: two phones, shared state, demo clock, seed data from assets.
2. Caregiver setup flow (above).
3. Elder reminder screen with the elder's name, medicine image, four buttons, audio clip, and log to caregiver timeline.
4. Escalation and alert ownership.
5. Caregiver home (one card per elder, one-line status) and dashboard with log and shared notes.
6. Safety behaviors: not sure, as-needed, conflicts, emergency.
7. Consent screen (separate toggles for medication status, wellbeing, location; note that help and emergency alerts always go through) and a Bangla daily summary built from a template. (16 Oct: an AI summary by Gemini now sits on top of the template record, for today, yesterday, 7 days and 4 weeks; the template stays as the offline fallback and the visible facts.)
8. Polish, seeded reset state, rehearse the 3-minute demo script.

Cut order if time runs short: consent screen, phone-unreachable toggle, conflict display. Stages 1-6 are the core.

## 3-minute demo script
Add medicine -> activate -> reminder -> tap taken -> dashboard updates -> skip time, dose missed -> caregiver alert -> acknowledge -> "not sure" -> emergency -> summary.

## Assets (in /assets)
About 15 medicine packet photos, 3 prescription photos (attach-for-reference only), photos of the elders (father "Baba", mother "Ma") and the primary caregiver. **Medicine names must be confirmed by the user.** Look at each packet photo, propose its name, show a table, and wait for corrections before writing medicines.json. Do not guess names from the handwritten prescriptions.

## Voice
Bangla audio clips are generated by `generate_voice.py` from `lines.json` (Gemini TTS, key in `.env` as GEMINI_API_KEY, never in code or chat). Output goes to `audio/` with `manifest.json` mapping clip id -> file, text, and when it plays. Play the clip if it exists; always also show the Bangla text. Clips are per elder where the line uses the name (suffix _baba / _ma).

## Be honest in the presentation
Live: the UI and logic. Scripted/simulated: seeded elder data (4 weeks), the demo clock, alerts between phones. Live AI: voice understanding, printed-prescription reading, AI summary. Handwritten prescriptions and free Bangla conversation are roadmap items, so do not fake them in the UI.

## Voice-first rules for the elder screen (decided 15 Oct 2026)
- Elder UI is ONE stage: Chotu's face on top, large captions in the middle, medicine photo below. Only captions and the ring state change. Emergency button is always visible.
- Chotu speaks first (Gemini TTS clip), then the mic opens automatically. No mic button. Ring + live caption show "listening".
- Normal reminder = zero taps. Flow: speak -> listen -> logged -> "ধন্যবাদ, লিখে রাখলাম।" (the 5-second undo was removed on 16 Oct at the user's request; unclear answers still get a read-back).
- Buttons appear only after two silent or failed attempts: "হ্যাঁ, খেয়েছি" / "না, এখনও না" + "আবার শুনুন". After that, alert the family.
- Never blame the elder: "আমি ঠিক বুঝতে পারিনি, আবার বলবেন?" Max 2 retries.
- Understanding = intent classification, not transcription. Send the short audio clip to a Gemini Flash model with a fixed JSON schema: {intent: took|not_yet|forgot|help|pain|other, confidence, transcript}. Low confidence -> spoken read-back before logging.
- "জরুরি", "বাঁচাও", "সাহায্য করুন" while listening start the 5-second emergency countdown; "বাতিল" cancels it.
- Browser rule: audio and mic need one first touch. Add a presenter-only "simulate voice" panel as a fallback. Do not claim always-on listening.
- Fonts: Noto Sans Bengali (Bangla), Noto Sans (English). Primary colour navy #0B2F8A from the logo on light blue backgrounds.
- Gemini API free tier is enough for the demo (Flash audio input, TTS, Transcribe models are free; image generation is not). Free-tier content may be used by Google to improve products: use only volunteer or synthetic voice clips, never real patient data. Key lives in .env only. A tiny local server keeps the key out of the browser.
- Do not state the browser or Gemini works for every Bangla dialect. Run the 10-clip accent test first and report real hit rates.
