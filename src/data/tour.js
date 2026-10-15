// Guided tour for the presenter panel: every workflow in the demo, with the moment it starts from
// (see 'demo/setup' in src/state/store.jsx) and the exact steps to follow on the two phones.
// Clock values are minutes from midnight of demo day 0 (470 = 7:50 AM).

export const TOUR = [
  {
    id: 'add', group: 'Family sets up', title: 'Add and verify a medicine',
    setup: { clock: 470 },
    steps: [
      'Caregiver phone: tap “ওষুধ যোগ করুন”, then “বাবা”.',
      'Type eco and tap Ecosprin 75. Check the packet photo and tap “হ্যাঁ, এটাই”.',
      'Tap “সকাল” (it shows 8:00 from Baba’s breakfast time). Leave “খাবারের পরে”. Optionally attach a prescription photo.',
      'Tap “পরের ধাপ” to see the one-screen summary.',
      'Tap “যাচাই করে চালু করুন”. Baba’s card now shows Comet 500 + Ecosprin 75 at 8:00.',
    ],
  },
  {
    id: 'verify', group: 'Family sets up', title: 'Rumana adds, Shumon verifies',
    setup: { clock: 470, caregiver: 'ruma' },
    steps: [
      'The caregiver phone is Rumana’s. Add any medicine for Baba (same steps as above).',
      'On the summary the button says “শুমনের কাছে যাচাইয়ের জন্য পাঠান”: only the primary caregiver can switch it on. Tap it.',
      'Top bar: switch Caregiver to Shumon ★. His home shows “যাচাই বাকি (১)”.',
      'Open it and tap “যাচাই করে চালু করুন” (or “বাতিল করুন”).',
    ],
  },
  {
    id: 'took', group: 'Medicine reminders', title: 'Reminder answered by voice',
    setup: { clock: 470 },
    steps: [
      'Panel: “Next dose →”. Chotu speaks on Baba’s phone, then shows “শুনছি…”.',
      'Say “খেয়েছি” (microphone on) or click the chip “খেয়েছি”.',
      'Chotu says “লিখে রাখলাম, ভুল হলে না বলুন” and a 5-second bar runs.',
      'After it ends, the caregiver card turns green: “Comet 500 খেয়েছেন”. Zero taps on Baba’s phone.',
    ],
  },
  {
    id: 'undo', group: 'Medicine reminders', title: 'Unclear answer, read-back and undo',
    setup: { clock: 470 },
    steps: [
      'Panel: “Next dose →”. When listening, click the chip “হুঁ… ওই যে… খাইলাম মনে হয়” (a mumbled answer).',
      'Chotu is not sure, so it asks “আপনি কি বললেন, ওষুধ খেয়েছেন?”. Click “হ্যাঁ”.',
      'During the 5-second bar, click “না”: Chotu says “ঠিক আছে, মুছে দিলাম” and asks again. Nothing was logged.',
      'Now click “খেয়েছি” and let the bar finish.',
    ],
  },
  {
    id: 'notyet', group: 'Medicine reminders', title: '“Not yet”, asked again later',
    setup: { clock: 470 },
    steps: [
      'Panel: “Next dose →”. When listening, click “এখনও খাইনি”.',
      'Chotu says it will remind again. The caregiver card shows “পরে খাবেন বলেছেন” in amber.',
      'Top bar: “+10 min”. Chotu asks again: “বাবা, ওষুধটি কি খেয়েছেন?”.',
    ],
  },
  {
    id: 'missed', group: 'Medicine reminders', title: 'No answer, family alert, Rumana if no one acts',
    setup: { clock: 470 },
    steps: [
      'Panel: “Next dose →”. Click “(চুপ)” twice (or wait 9 seconds twice). Big buttons appear: “হ্যাঁ, খেয়েছি” / “না, এখনও না”.',
      'Top bar: “+10 min” (8:10, Chotu repeats) and “+10 min” again (8:20, repeats again).',
      '“+10 min” once more (8:30): Baba hears “আপনার উত্তর পাইনি…”. Shumon gets a banner with Baba’s photo.',
      '“+10 min” (8:40) without tapping anything: Rumana is told too. Switch Caregiver to Rumana to see her banner.',
      'Tap the banner and “আমি দেখছি”. Escalation stops; Baba hears “আপনার পরিবারের একজন বিষয়টি দেখছেন”. Then “সমাধান হয়েছে”.',
    ],
  },
  {
    id: 'forgot', group: 'Safety', title: '“মনে নেই” (does not remember)',
    setup: { clock: 470 },
    steps: [
      'Panel: “Next dose →”. When listening, click “মনে নেই”.',
      'Chotu never says “take it”. It asks Baba to wait and tells the family.',
      'Caregiver: open the banner. The alert shows when Comet 500 was last taken (yesterday 8:04).',
    ],
  },
  {
    id: 'help', group: 'Safety', title: 'Asking for help',
    setup: { clock: 470 },
    steps: [
      'Panel: “Next dose →”. When listening, click “আমাকে একটু সাহায্য করুন”.',
      'Help goes to everyone at once (no waiting ladder). Open the banner on the caregiver phone.',
    ],
  },
  {
    id: 'sos', group: 'Safety', title: 'Emergency and cancel',
    setup: { clock: 470 },
    steps: [
      'Elder phone: tap the red “জরুরি অবস্থা”. A 5-second countdown starts with a huge “বাতিল করুন”. Tap it to cancel.',
      'Tap “জরুরি অবস্থা” again and let it reach 0. Baba sees “শান্ত থাকুন” and who was told.',
      'Caregiver: red banner → full red screen with Baba’s photo, “৯৯৯-এ ফোন করুন” and “আমি দেখছি”.',
      'By voice: during a reminder, the chip “বাঁচাও! জরুরি!” starts the countdown and “বাতিল” cancels it.',
    ],
  },
  {
    id: 'prn', group: 'Safety', title: 'Ma’s as-needed medicine',
    setup: { clock: 470, elder: 'ma' },
    steps: [
      'The elder phone shows Ma. Her Napa Extra card has “এখন খেলাম”. She last took it at 6:30.',
      'Tap “এখন খেলাম”. It is always logged, but it is only 1 hour 20 minutes since the last one (the family’s rule is 6 hours).',
      'Caregiver: the banner explains which rule was broken. No medical advice is given.',
    ],
  },
  {
    id: 'conflict', group: 'Safety', title: 'A dose written down twice',
    setup: { clock: 485, caregiver: 'ruma' },
    steps: [
      'It is 8:05 and Baba already said “খেয়েছি” for his morning dose.',
      'Rumana’s phone: tap “বাবা”. Under Comet 500 tap “আমি খাইয়ে দিয়েছি, লিখে রাখুন”.',
      'The dose shows “দুইবার লেখা” with who entered each, and the home card asks the family to check.',
    ],
  },
  {
    id: 'checkin', group: 'Health and habits', title: 'Afternoon check-in',
    setup: { clock: 955 },
    steps: [
      'It is 3:55 PM; the medicines so far were taken. Top bar: “+10 min”. At 4:00 Chotu starts by itself.',
      'Answer the four questions with chips (or voice): “হাঁটুতে একটু ব্যথা” → “না, হয়নি” → “হ্যাঁ, হয়েছে” → “(চুপ)”. Silence just skips.',
      'Caregiver home: “আজ ব্যথার কথা বলেছেন”. Tap “বাবা” to see the “বিকেলের কথা” card.',
      'Any time: the panel’s “Afternoon check-in now” starts it without moving the clock.',
    ],
  },
  {
    id: 'unreachable', group: 'Settings and privacy', title: 'Phone unreachable',
    setup: { clock: 470, unreachable: 'baba' },
    steps: [
      'Baba’s phone shows “সংযোগ নেই”. Panel: “Next dose →”, then top bar “+30 min”.',
      'The alert says Chotu could not reach Baba’s phone, instead of “did not answer”.',
      'Untick “Baba’s phone unreachable” in the panel to bring the phone back.',
    ],
  },
  {
    id: 'consent', group: 'Settings and privacy', title: 'Consent',
    setup: { clock: 470 },
    steps: [
      'Panel: “Show consent screen on Baba’s phone”. Chotu reads the consent line.',
      'Turn “ওষুধ খাওয়ার খবর” to “না” and tap “ঠিক আছে, রাজি”.',
      'Caregiver: Baba’s card says sharing is off; the “সেটিংস” tab lists what he shares.',
      'Panel: “Next dose →”, then “+30 min”: no missed-dose alert. Help and emergency would still come through.',
    ],
  },
  {
    id: 'dashboard', group: 'Family dashboard', title: 'Dashboard and shared notes',
    setup: { clock: 820, caregiver: 'ruma' },
    steps: [
      'Rumana’s phone: tap “বাবা”. “আজ” shows today’s doses, the check-in card and the timeline.',
      '“ওষুধ”: every medicine with schedule and status; tap one to see its prescription photo.',
      '“নোট”: write a note and tap “নোটে যোগ করুন”. Switch to Shumon: he sees it.',
      '“প্রোফাইল”: meal, sleep and check-in times, and the alert order (only Shumon can reorder).',
    ],
  },
  {
    id: 'summary', group: 'Family dashboard', title: 'Daily and 7-day summary',
    setup: { clock: 1300, checkinDone: true },
    steps: [
      'Caregiver: “সারাংশ” tab. “আজ” lists medicines, health and habits, alerts and notes.',
      'Tap “৭ দিন”: “লক্ষ্য করার মতো” (missed doses, knee pain), adherence per medicine and the habits grid.',
      'Switch to “মা”: less walking and low water show up. Tap “সারাংশ কপি করুন” to copy the text.',
    ],
  },
  {
    id: 'mic', group: 'Live voice', title: 'Talk to Chotu with the microphone',
    setup: { clock: 470 },
    steps: [
      'Use Chrome at http://localhost:5173 (the app preview blocks the microphone). Click the page once.',
      'Panel: “Turn on microphone” and allow it in Chrome.',
      '“Next dose →”. After Chotu speaks, say “খেয়েছি”. The bars move with your voice, then “বুঝছি…”.',
      'The panel shows what was heard, e.g. Heard “খেয়েছি” → took it (95% sure).',
    ],
  },
];
