// Rehearsal workflows: every workflow in the demo, the moment it starts from (see 'demo/setup' in
// src/state/store.jsx) and the steps to follow. "Start" sets everything up, closes Demo settings and shows
// a small guide card with the steps, the elder's answer chips and the clock buttons.
// Clock values are minutes from midnight of demo day 0 (470 = 7:50 AM, 480 = 8:00 AM, a dose time).
// view: which phone to show first. A step that starts with "Elder" or "Caregiver" switches to that phone
// when only one phone fits on the screen.

export const TOUR = [
  {
    id: 'add', group: 'Family sets up', title: 'Add and verify a medicine', view: 'care',
    setup: { clock: 470 },
    steps: [
      'Caregiver: tap “ওষুধ যোগ করুন”, then “বাবা”.',
      'Caregiver: type eco and tap Ecosprin 75. Check the packet photo and tap “হ্যাঁ, এটাই”.',
      'Caregiver: tap “সকাল” (8:00, from Baba’s breakfast time). Leave “খাবারের পরে”. Set how many tablets are at home.',
      'Caregiver: tap “পরের ধাপ” to see the one-screen summary, then “যাচাই করে চালু করুন”.',
      'Caregiver: Baba’s card now shows Comet 500 + Ecosprin 75 at 8:00.',
      'Tap “+10 min” in this card. Elder: at 8:00 Chotu asks about one medicine at a time: Comet 500 (ওষুধ ১/২) with a big photo, then after “খেয়েছি” Ecosprin 75 (ওষুধ ২/২).',
    ],
  },
  {
    id: 'scan', group: 'Family sets up', title: 'Read a prescription photo (AI)', view: 'care',
    setup: { clock: 470 },
    steps: [
      'Caregiver: tap “ওষুধ যোগ করুন”, then “মা”, then “প্রেসক্রিপশনের ছবি থেকে”.',
      'Caregiver: pick one of the sample prescriptions. Gemini reads it (a few seconds; needs internet).',
      'Caregiver: check each medicine, time and duration it found. Fix anything, untick what you don’t want.',
      'Caregiver: “এগুলো যোগ করুন”. Each one still waits for “যাচাই করে চালু করুন”: AI never switches a schedule on.',
    ],
  },
  {
    id: 'verify', group: 'Family sets up', title: 'Rumana adds, Shumon verifies', view: 'care',
    setup: { clock: 470, caregiver: 'ruma' },
    steps: [
      'Caregiver: this is Rumana’s phone. Add any medicine for Baba (same steps as “Add and verify”).',
      'Caregiver: the last button says “শুমনের কাছে যাচাইয়ের জন্য পাঠান”: only the primary caregiver can switch it on. Tap it.',
      'Demo settings → Who is on each phone: choose শুমন (ছেলে). His home shows “যাচাই বাকি (১)”.',
      'Caregiver: open it and tap “যাচাই করে চালু করুন” (or “বাতিল করুন”).',
    ],
  },
  {
    id: 'took', group: 'Medicine reminders', title: 'Reminder answered by voice', view: 'both',
    setup: { clock: 480 },
    steps: [
      'Elder: it is 8:00. Chotu speaks on Baba’s phone, then shows “শুনছি…”. Two medicines are due: Comet 500 (ওষুধ ১/২) and the weekly D-Rise (২/২, every Saturday).',
      'Elder: tap the chip “খেয়েছি” in this card (or say it, with the microphone on).',
      'Elder: Chotu says “ধন্যবাদ, লিখে রাখলাম” and moves to D-Rise. Tap “খেয়েছি” again. Zero taps on Baba’s phone.',
      'Caregiver: the card turns green. In “বাবা” → “ওষুধ”, D-Rise shows “প্রতি শনিবার”.',
    ],
  },
  {
    id: 'undo', group: 'Medicine reminders', title: 'Unclear answer, read back first', view: 'elder',
    setup: { clock: 480 },
    steps: [
      'Elder: when Chotu is listening, tap the chip “হুঁ… ওই যে… খাইলাম মনে হয়” (a mumbled answer).',
      'Elder: Chotu is not sure, so it asks “আপনি কি বললেন, ওষুধ খেয়েছেন?”.',
      'Elder: tap “হ্যাঁ”. Only now is the dose logged.',
    ],
  },
  {
    id: 'notyet', group: 'Medicine reminders', title: '“Not yet”, asked again later', view: 'both',
    setup: { clock: 480 },
    steps: [
      'Elder: when Chotu is listening, tap “এখনও খাইনি”.',
      'Caregiver: the card shows “পরে খাবেন বলেছেন” in amber.',
      'Tap “+10 min” in this card. Elder: Chotu asks again: “বাবা, ওষুধটি কি খেয়েছেন?”.',
    ],
  },
  {
    id: 'missed', group: 'Medicine reminders', title: 'No answer, family alert, Rumana if no one acts', view: 'both',
    setup: { clock: 480 },
    steps: [
      'Elder: tap “(চুপ)” twice. Big buttons appear: “হ্যাঁ, খেয়েছি” / “না, এখনও না”.',
      'Tap “+10 min” twice (8:10 and 8:20): Chotu repeats the reminder each time.',
      'Tap “+10 min” once more (8:30). Caregiver: Shumon gets a banner with Baba’s photo.',
      'Tap “+10 min” (8:40) without tapping the banner: Rumana is told too.',
      'Caregiver: tap the banner and “আমি দেখছি”. Escalation stops; Baba hears that the family is on it.',
    ],
  },
  {
    id: 'forgot', group: 'Safety', title: '“মনে নেই” (does not remember)', view: 'both',
    setup: { clock: 480 },
    steps: [
      'Elder: when Chotu is listening, tap “মনে নেই”.',
      'Elder: Chotu never says “take it”. It asks Baba to wait and tells the family.',
      'Caregiver: open the banner. It shows when Comet 500 was last taken (yesterday 8:04).',
    ],
  },
  {
    id: 'help', group: 'Safety', title: 'Asking for help', view: 'both',
    setup: { clock: 480 },
    steps: [
      'Elder: when Chotu is listening, tap “আমাকে একটু সাহায্য করুন”.',
      'Caregiver: help goes to everyone at once (no waiting ladder). Open the banner.',
    ],
  },
  {
    id: 'sos', group: 'Safety', title: 'Emergency and cancel', view: 'both',
    setup: { clock: 470 },
    steps: [
      'Elder: tap the red “জরুরি অবস্থা”. A 5-second countdown starts with a huge “বাতিল করুন”. Tap it.',
      'Elder: tap “জরুরি অবস্থা” again and let it reach 0. Baba sees “শান্ত থাকুন” and who was told.',
      'Caregiver: red banner → full red screen with Baba’s photo, “৯৯৯-এ ফোন করুন” and “আমি দেখছি”.',
    ],
  },
  {
    id: 'prn', group: 'Safety', title: 'Ma’s as-needed medicine', view: 'both',
    setup: { clock: 470, elder: 'ma' },
    steps: [
      'Elder: Ma’s Napa Extra card has “এখন খেলাম”. She last took it at 6:30.',
      'Elder: tap “এখন খেলাম”. It is always logged, but it is only 1 hour 20 minutes since the last one (the family’s rule is 6 hours).',
      'Caregiver: the banner explains which rule was broken. No medical advice is given.',
    ],
  },
  {
    id: 'conflict', group: 'Safety', title: 'A dose written down twice', view: 'care',
    setup: { clock: 485, caregiver: 'ruma' },
    steps: [
      'Caregiver: it is 8:05 and Baba already said “খেয়েছি”. On Rumana’s phone tap “বাবা”.',
      'Caregiver: under Comet 500 tap “আমি খাইয়ে দিয়েছি, লিখে রাখুন”.',
      'Caregiver: the dose shows “দুইবার লেখা” with who entered each.',
    ],
  },
  {
    id: 'checkin', group: 'Health and habits', title: 'Afternoon check-in', view: 'both',
    setup: { clock: 960 },
    steps: [
      'Elder: it is 4:00 PM, so Chotu starts the check-in by itself.',
      'Elder: answer with the chips: “হাঁটুতে একটু ব্যথা” → “না, হয়নি” → “হ্যাঁ, হয়েছে” → “(চুপ)”. Silence just skips.',
      'Caregiver: home says “আজ ব্যথার কথা বলেছেন”. Tap “বাবা” to see the “বিকেলের কথা” card.',
    ],
  },
  {
    id: 'custom', group: 'Times and stock', title: 'Exact time and stock count', view: 'care',
    setup: { clock: 470 },
    steps: [
      'Caregiver: “ওষুধ যোগ করুন” → “মা” → Ecosprin 75 → “হ্যাঁ, এটাই”.',
      'Caregiver: under “অন্য সময়” pick 10:00 PM and tap “যোগ করুন”. The before/after-meal question hides.',
      'Caregiver: set “এখন কতটি আছে?” and when to warn. “পরের ধাপ” → “যাচাই করে চালু করুন”.',
      'Demo settings → Time: type 10:00 PM and “Go to today”. Elder: choose Ma; Chotu reminds her about Ecosprin.',
    ],
  },
  {
    id: 'refill', group: 'Times and stock', title: 'Running low: “ওষুধ কিনতে হবে”', view: 'care',
    setup: { clock: 770, elder: 'ma' },
    steps: [
      'Caregiver: Baba has 6 Angilock Plus left (one a day). Each dose taken counts down.',
      'Tap “+30 min” in this card. Baba takes his 1:00 PM dose, 5 are left: his family’s warning point.',
      'Caregiver: an amber “ওষুধ কিনতে হবে” alert (not urgent, no escalation). Baba’s card shows it too.',
      'Caregiver: open it and tap “কিনেছি, ৩০টি যোগ করুন”. The count goes up and the alert closes.',
    ],
  },
  {
    id: 'call', group: 'Times and stock', title: 'Elder calls the family', view: 'both',
    setup: { clock: 470 },
    steps: [
      'Elder: tap “পরিবারকে ফোন করুন” and pick শুমন by photo. (Demo: no real call.)',
      'Caregiver: only Shumon gets “বাবা আপনাকে ফোন করেছিলেন”.',
    ],
  },
  {
    id: 'unreachable', group: 'Settings and privacy', title: 'Phone unreachable', view: 'care',
    setup: { clock: 480, unreachable: 'baba' },
    steps: [
      'Baba’s phone is set to “unreachable”. Tap “+30 min” in this card.',
      'Caregiver: the alert says Chotu could not reach Baba’s phone, instead of “did not answer”.',
      'Demo settings → Escalation: untick “Baba’s phone unreachable” to bring it back.',
    ],
  },
  {
    id: 'consent', group: 'Settings and privacy', title: 'Consent', view: 'both',
    setup: { clock: 470, consent: 'baba' },
    steps: [
      'Elder: the consent screen is open on Baba’s phone and Chotu reads it.',
      'Elder: turn “ওষুধ খাওয়ার খবর” to “না” and tap “ঠিক আছে, রাজি”.',
      'Caregiver: Baba’s card says sharing is off; the “সেটিংস” tab lists what he shares.',
      'Help and emergency alerts still always go through.',
    ],
  },
  {
    id: 'dashboard', group: 'Family dashboard', title: 'Dashboard and shared notes', view: 'care',
    setup: { clock: 820, caregiver: 'ruma' },
    steps: [
      'Caregiver: on Rumana’s phone tap “বাবা”. “আজ” shows today’s doses, the check-in card and the timeline.',
      'Caregiver: “ওষুধ” lists every medicine with schedule and stock; tap one to see its prescription photo.',
      'Caregiver: “নোট”: write a note and tap “নোটে যোগ করুন”. Shumon sees it too.',
      'Caregiver: “প্রোফাইল”: meal, sleep and check-in times, and the alert order.',
    ],
  },
  {
    id: 'summary', group: 'Family dashboard', title: 'AI summary: today and the last weeks', view: 'care',
    setup: { clock: 1300, checkinDone: true },
    steps: [
      'Caregiver: “সারাংশ” tab. At the top, Gemini writes a short summary of Baba’s day (needs internet).',
      'Caregiver: tap “৭ দিন” or “৪ সপ্তাহ”: patterns over time, signals to watch and practical tips for the family.',
      'Caregiver: the facts it used are listed below. It never diagnoses or changes medicine.',
      'Caregiver: switch to “মা”: less walking and low water show up.',
    ],
  },
  {
    id: 'mic', group: 'Live voice', title: 'Talk to Chotu with the microphone', view: 'elder',
    setup: { clock: 470 },
    steps: [
      'Use Chrome at http://localhost:5173 or the online link (the app preview blocks the microphone).',
      'Demo settings → Live voice: “Turn on microphone” and allow it in Chrome.',
      'Demo settings → “Next dose →”. After Chotu speaks, say “খেয়েছি” or a full sentence like “হ্যাঁ বাবা, সকালের ওষুধ খেয়ে নিয়েছি”.',
      'Demo settings shows what was heard and the meaning, e.g. → took it (95% sure).',
    ],
  },
];
