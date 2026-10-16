# Chotu demo

Chotu is a Bangla-first, voice-driven care companion for older adults (60+) in Bangladesh. This repository is a **clickable competition prototype**: an elder phone and a caregiver phone side by side in one browser page, sharing one state, with a demo clock and a presenter panel.

- Live version: https://chotu-demo.vercel.app
- Product rules and safety rules: [CLAUDE.md](CLAUDE.md) (read this first; it is the source of truth for behaviour)
- Presentation script and the guided tour: [DEMO-SCRIPT.md](DEMO-SCRIPT.md)

## Run it locally

Requirements: Node.js 20+ (tested on 24), npm. Python 3.12 only if you regenerate voice clips.

```bash
npm install
cp .env.example .env      # then put your own Gemini API key in .env
npm run dev               # http://localhost:5173
```

On Windows you can also double-click `start-demo.bat`.

- Everything except the three AI features (speech understanding, prescription photo reading, AI summary) works **without an API key and offline**: the presenter panel's chips stand in for the elder's voice, medicines can be added by name, and the summary screen still shows the template record.
- Use your **own** Gemini key (Google AI Studio → Get API key). Never commit `.env`; it is git-ignored.
- The microphone needs a secure origin: `localhost` or the HTTPS Vercel site.

## How it is built

React 19 + Vite, no UI library, no backend database. All state lives in one reducer and is saved to `localStorage` (`chotu-demo-state`). **Reset demo** restores the seed data.

```
src/
  App.jsx                 layout: top bar, two phones, presenter panel; scales phones to the window
  state/store.jsx         the one reducer (all actions) + localStorage persistence
  state/escalation.js     runs on every clock move: missed doses, alert ladder, off-screen auto-answers
  data/seed.js            sample people, schedules, a week of history, notes, consent, check-ins
  data/medicines.json     medicine library (names confirmed by the product owner) -> public/img/med
  data/tour.js            the 17 guided-tour workflows (setup moment + steps)
  lib/schedule.js         dose times from meal times, due doses, statuses, as-needed checks
  lib/checkin.js          afternoon check-in questions and answer mapping
  lib/time.js             demo clock helpers, Bangla digits and times
  lib/voice.js            plays Chotu's clips (audio/manifest.json), captions, simulated-voice bus
  lib/mic.js              microphone capture -> 16 kHz WAV -> POST /api/understand
  elder/ElderPhone.jsx    elder UI: reminder state machine, undo, read-back, buttons fallback,
                          emergency countdown, as-needed, consent screen, check-in
  caregiver/              caregiver UI: home, add-medicine flow, verify, alerts, dashboard,
                          notes, profile, settings (consent), summary engine
  components/             phone frame, top bar, presenter panel (tour, chips, mic switch), icons
api/
  understand.js           server-only: audio clip -> Gemini -> {intent, confidence, transcript}
  prescription.js         server-only: printed prescription photo -> Gemini -> medicine lines (src/lib/rx.js turns them into drafts)
  summary.js              server-only: facts from src/lib/facts.js -> Gemini -> Bangla headline, signals, family tips
  _gemini.js              shared helper: JSON-schema calls with model fallback
  status.js               tells the page if a key is set (never returns it)
vite.config.js            runs /api/* inside the dev server (same handlers Vercel runs in production)
```

### Key ideas

- **Demo clock.** Time is `state.clock` in minutes from midnight of demo day 0 (470 = 7:50 AM). It only moves with the top-bar buttons. `runEscalation` (in `state/escalation.js`) is called on every clock move and handles repeats/missed doses (+10/+20/+30 minutes) and the caregiver alert ladder.
- **Dose keys** look like `regimenId@day@slot` (as-needed: `regimenId@day@prn-<minute>`). Records live in `state.doses`.
- **Elder phone** is a small state machine in `ElderPhone.jsx` (`idle → speak → listen → logged/readback/buttons → done`, plus `countdown`, `sent`, `ci-speak`, `ci-listen`). Timer callbacks read the latest state through refs.
- **Voice.** Chotu's lines live in `lines.json`; clips are pre-generated into `audio/` with `generate_voice.py` (Gemini TTS) or `generate_voice_alt.mjs` (preview TTS models when the daily quota runs out), then `node rebuild_manifest.mjs`. Captions always show, with or without a clip.
- **Understanding** is intent classification, not transcription: `api/understand.js` sends the clip to a Gemini Flash model with a fixed JSON schema and falls back between models when one is busy. Confidence below 0.6 is read back before logging.
- **Presenter-only controls** (top bar, panel, chips, guided tour) are part of the demo, not the product.

## Safety rules (do not break)

From CLAUDE.md, enforced in code:
- Nothing goes live without the primary caregiver's verification (`regimen/activate` checks it).
- "মনে নেই" never tells the elder to take the medicine; it alerts the family with the last dose time.
- As-needed doses are always logged; breaking the family's limits alerts caregivers.
- Emergency: 5-second countdown with a large Cancel, then everyone is alerted. Help and emergency ignore consent settings.
- No medical advice or diagnosis anywhere. The AI summary prompt forbids diagnosis and any medicine change, tips that mention changing doses are dropped on the server, and only facts the elder consented to share are sent.
- Every alert shows the elder's photo and name.

## Deploying

The live site is a Vercel project. `vercel.json` builds with Vite and gives the API functions 30 s. Set `GEMINI_API_KEY` (and optionally `MIC_PASSCODE` to require a passcode for the microphone) in the Vercel project settings, then:

```bash
npx vercel deploy --prod
```

## Assets and data

- `Assets/` holds the original photos; the app uses copies with simple file names in `public/img/`.
- All people, schedules and histories are **synthetic** sample data for the demo.
- On the Gemini free tier Google may use what you send to improve its products: test only with your own, volunteer or synthetic voices, never real patient data.
