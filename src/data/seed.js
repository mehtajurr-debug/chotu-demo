// Seed (sample) data for the demo. "Reset demo" restores exactly this.
// All people and schedules here are synthetic, for the presentation only.

export const START_CLOCK = 7 * 60 + 50; // day 0, 07:50 (10 minutes before Baba's morning dose)

// Yesterday's doses, all taken: [dose key, elder, minute taken (day -1), log text]
const Y = (h, m) => -24 * 60 + h * 60 + m;
const YESTERDAY = [
  ['b1@-1@morning', 'baba', Y(8, 4), 'Comet 500 খেয়েছেন (কথায় বলেছেন)'],
  ['m1@-1@noon', 'ma', Y(13, 2), 'Osartil Plus খেয়েছেন (কথায় বলেছেন)'],
  ['b2@-1@noon', 'baba', Y(13, 9), 'Angilock Plus খেয়েছেন (কথায় বলেছেন)'],
  ['m2@-1@night', 'ma', Y(20, 50), 'Calbo-D খেয়েছেন (কথায় বলেছেন)'],
  ['b3@-1@night', 'baba', Y(21, 6), 'Rosuva 10 খেয়েছেন (কথায় বলেছেন)'],
];

// ---------- four weeks of history (days -27 to -2), so the summaries can show trends ----------
// The story: Baba was steady for two weeks; in the last two his knee pain comes up more, he walks less, sleeps
// worse and misses his 9 PM dose more often. Ma is steady with medicines but often drinks too little water,
// and uses her as-needed Napa Extra more often lately (she mentions a heavy head).
const D = (day, h, m) => day * 24 * 60 + h * 60 + m;
const HISTORY_DAYS = Array.from({ length: 26 }, (_, i) => -27 + i);
const SLOT_AT = { b1: ['baba', 'morning', 8, 0], b2: ['baba', 'noon', 13, 0], b3: ['baba', 'night', 21, 0], m1: ['ma', 'noon', 13, 0], m2: ['ma', 'night', 20, 45] };
const MISSED_BEFORE = new Set(['b1@-20@morning', 'b3@-12@night', 'b3@-9@night', 'b3@-6@night', 'b2@-4@noon', 'b3@-3@night', 'm2@-17@night', 'm2@-3@night']);
// Late answers (minutes after the reminder) in the last two weeks for Baba's night dose
const LATE = { 'b3@-13@night': 24, 'b3@-11@night': 27, 'b3@-8@night': 22, 'b3@-5@night': 26 };
const OLDER_DOSES = {};
for (const day of HISTORY_DAYS) {
  for (const [rid, [elderId, slot, h, m]] of Object.entries(SLOT_AT)) {
    const key = `${rid}@${day}@${slot}`;
    const at = D(day, h, m);
    OLDER_DOSES[key] = MISSED_BEFORE.has(key)
      ? { status: 'missed', at: at + 30, how: 'none' }
      : { status: 'taken', at: at + (LATE[key] ?? ((((day * 7 + h) % 6) + 6) % 6) + 2), how: 'voice', by: elderId };
  }
}
// Baba's weekly D-Rise (every Saturday morning; demo day 0 is a Saturday), taken each week so far
for (const day of [-21, -14, -7]) OLDER_DOSES[`b4@${day}@morning`] = { status: 'taken', at: D(day, 8, 3), how: 'voice', by: 'baba' };

// Ma's as-needed Napa Extra: about once a week at first, more often lately
for (const [day, h, m] of [[-24, 15, 10], [-17, 16, 40], [-10, 11, 20], [-8, 17, 5], [-5, 15, 10], [-4, 12, 30], [-2, 11, 40]]) {
  OLDER_DOSES[`m3@${day}@prn-${D(day, h, m)}`] = { status: 'taken', at: D(day, h, m), how: 'button', by: 'ma' };
}

// Afternoon check-ins: feeling = good | unwell | pain; walk / water / sleep = true (yes) | false (no) | null (no answer)
const CI = (elderId, day, feeling, walk, water, sleep, said = {}) => [`${elderId}@${day}`, { at: D(day, 16, 6), how: 'voice', answers: { feeling, walk, water, sleep }, said }];
const BABA_SAID = {
  '-11': 'হাঁটুতে ব্যথা, সিঁড়ি ভাঙতে কষ্ট', '-9': 'হাঁটুটা আবার ব্যথা করছে', '-7': 'শরীরটা ম্যাজম্যাজ করছে',
  '-4': 'শরীরটা একটু দুর্বল লাগছে', '-3': 'হাঁটুতে ব্যথা করছে', '-1': 'হাঁটুতে একটু ব্যথা',
};
const BABA_FEEL = { '-22': 'unwell', '-11': 'pain', '-9': 'pain', '-7': 'unwell', '-4': 'unwell', '-3': 'pain', '-1': 'pain' };
const BABA_NOWALK = new Set([-19, -12, -11, -9, -8, -7, -6, -4, -3]);
const BABA_LOWWATER = new Set([-25, -16, -5]);
const BABA_BADSLEEP = new Set([-23, -11, -8, -4, -3, -1]);
const MA_SAID = { '-16': 'একটু ক্লান্ত লাগছে', '-10': 'মাথাটা ব্যথা করছে', '-3': 'মাথাটা একটু ভার লাগছে' };
const MA_FEEL = { '-16': 'unwell', '-10': 'unwell', '-3': 'unwell' };
const MA_WALK = new Set([-26, -24, -22, -21, -19, -17, -14, -12, -9, -7, -5, -2]);
const MA_LOWWATER = new Set([-20, -13, -11, -9, -6, -5, -3, -1]);
const MA_BADSLEEP = new Set([-10, -3]);
const SKIPPED = new Set(['baba@-20', 'ma@-15']); // no check-in those days
const CHECKINS = Object.fromEntries([...HISTORY_DAYS, -1].flatMap((day) => [
  ['baba', BABA_FEEL[day] || 'good', !BABA_NOWALK.has(day), !BABA_LOWWATER.has(day), !BABA_BADSLEEP.has(day), BABA_SAID[day]],
  ['ma', MA_FEEL[day] || 'good', MA_WALK.has(day), !MA_LOWWATER.has(day), !MA_BADSLEEP.has(day), MA_SAID[day]],
].filter(([id]) => !SKIPPED.has(`${id}@${day}`)).map(([id, feel, walk, water, sleep, said]) => CI(id, day, feel, walk, water, sleep, said ? { feeling: said } : {}))));

// Alerts from those earlier missed doses, already handled and resolved.
const PAST = (id, elderId, key, at, text, by) => ({
  id, elderId, kind: 'missed', text, doseKeys: [key], createdAt: at, ladder: true, level: 0,
  handledBy: by, handledAt: at + 6, resolvedAt: at + 25, seenBy: [by], told: true, handlingTold: true, unreachable: false,
});
const MISSED_TEXT = {
  b1: ['বাবা', 'সকালের', 'Comet 500', 'সকাল ৮:০০'], b2: ['বাবা', 'দুপুরের', 'Angilock Plus', 'দুপুর ১:০০'], b3: ['বাবা', 'রাতের', 'Rosuva 10', 'রাত ৯:০০'],
  m2: ['মা', 'রাতের', 'Calbo-D', 'রাত ৮:৪৫'],
};
const PAST_ALERTS = [...MISSED_BEFORE].map((key, i) => {
  const [rid, day] = key.split('@');
  const [, , h, m] = SLOT_AT[rid];
  const [who, part, med, time] = MISSED_TEXT[rid];
  return PAST(`past${i + 1}`, SLOT_AT[rid][0], key, D(Number(day), h, m) + 30, `${who} ${part} ওষুধের উত্তর দেননি (${med}, ${time})।`, i % 2 ? 'ruma' : 'shumon');
});

export function makeSeed() {
  return {
    version: 15,
    clock: START_CLOCK,
    elderOnPhone: 'baba', // which elder the elder phone is showing
    caregiverOnPhone: 'shumon', // who is holding the caregiver phone

    caregivers: [
      { id: 'shumon', name: 'শুমন', gen: 'শুমনের', nameEn: 'Shumon', relation: 'ছেলে', photo: '/img/shumon.png', primary: true },
      { id: 'ruma', name: 'রুমানা', gen: 'রুমানার', nameEn: 'Rumana', relation: 'মেয়ে', photo: null, primary: false },
    ],

    elders: [
      {
        id: 'baba',
        name: 'বাবা',
        gen: 'বাবার', // possessive form: 'Baba's'
        nameEn: 'Baba',
        photo: '/img/baba.png',
        meals: { breakfast: '07:45', lunch: '12:45', dinner: '20:45' },
        sleep: '22:30',
        checkinTime: '16:00', // afternoon check-in about health and habits
        alertOrder: ['shumon', 'ruma'],
        regimens: [
          { id: 'b1', medId: 'comet', amount: 1, stock: 20, refillDays: 5, slots: ['morning'], meal: 'after', duration: { type: 'ongoing' }, asNeeded: false, status: 'active', startDay: -28, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx1.png' },
          { id: 'b2', medId: 'angilock', amount: 1, stock: 6, refillDays: 5, slots: ['noon'], meal: 'after', duration: { type: 'ongoing' }, asNeeded: false, status: 'active', startDay: -28, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx1.png' },
          { id: 'b4', medId: 'd-rise', amount: 1, stock: 4, refillDays: 7, slots: ['morning'], weekdays: [6], meal: 'after', duration: { type: 'weeks', count: 8 }, asNeeded: false, status: 'active', startDay: -21, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx2.png' },
          { id: 'b3', medId: 'rosuva', amount: 1, stock: 25, refillDays: 5, slots: ['night'], meal: 'after', duration: { type: 'ongoing' }, asNeeded: false, status: 'active', startDay: -28, verifiedBy: 'shumon', rxPhoto: null },
        ],
      },
      {
        id: 'ma',
        name: 'মা',
        gen: 'মায়ের',
        nameEn: 'Ma',
        photo: '/img/ma.png',
        meals: { breakfast: '08:00', lunch: '13:30', dinner: '20:30' },
        sleep: '22:00',
        checkinTime: '16:00',
        alertOrder: ['shumon', 'ruma'],
        regimens: [
          { id: 'm1', medId: 'osartil', amount: 1, stock: 18, refillDays: 5, slots: ['noon'], meal: 'before', duration: { type: 'ongoing' }, asNeeded: false, status: 'active', startDay: -28, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx2.png' },
          { id: 'm2', medId: 'calbo-d', amount: 1, stock: 12, refillDays: 5, slots: ['night'], meal: 'after', duration: { type: 'weeks', count: 12 }, asNeeded: false, status: 'active', startDay: -28, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx2.png' },
          { id: 'm3', medId: 'napa-extra', amount: 1, stock: 8, refillDays: 3, slots: [], meal: 'after', duration: { type: 'ongoing' }, asNeeded: true, minGapHours: 6, maxPerDay: 3, status: 'active', startDay: -28, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx2.png' },
        ],
      },
    ],

    // One record per dose, keyed "regimenId@day@slot". status: taken | snoozed | unsure | help
    // Yesterday (day -1) is pre-filled so "last dose" has something real to show.
    doses: {
      ...OLDER_DOSES,
      ...Object.fromEntries(YESTERDAY.map(([key, elderId, at]) => [key, { status: 'taken', at, how: 'voice', by: elderId }])),
      // Ma took her as-needed Napa Extra at 6:30 this morning (so another one at 8:00 breaks the 6-hour rule).
      'm3@0@prn-390': { status: 'taken', at: 390, how: 'voice', by: 'ma' },
    },

    // What happened, newest last. Each entry: { at, elderId, text, by, kind }
    log: [
      ...YESTERDAY.map(([, elderId, at, text]) => ({ at, elderId, by: elderId, kind: 'dose', text })),
      { at: 390, elderId: 'ma', by: 'ma', kind: 'dose', text: 'Napa Extra খেয়েছেন (প্রয়োজনের ওষুধ, আজ ১ বার)' },
    ],
    // Medicines the caregiver typed in that are not in the library: { id, name, short, bn, strength, form, image }
    customMeds: [],
    // What each elder agreed to share with the family. Help and emergency alerts always go through.
    consent: {
      baba: { medication: true, wellbeing: true, location: false, agreedAt: Y(9, 0) },
      ma: { medication: true, wellbeing: true, location: false, agreedAt: Y(9, 0) },
    },
    showConsentFor: null, // presenter opens the consent screen on an elder phone
    // Presenter toggle: the elder NOT shown on the elder phone answers reminders by themselves (simulated),
    // so their alerts do not clutter the story being presented.
    othersAutoAnswer: true,

    // Afternoon check-ins, keyed "elderId@day" (see src/lib/checkin.js)
    checkins: CHECKINS,
    checkinRequest: null, // presenter asks an elder phone to start the check-in now

    // Alerts to caregivers (see src/state/escalation.js)
    alerts: PAST_ALERTS,
    // Presenter toggle: this elder's phone can't be reached (changes the alert wording)
    unreachable: { baba: false, ma: false },
    // Shared notes between caregivers, per elder.
    notes: [
      { id: 'n1', elderId: 'baba', by: 'ruma', at: Y(19, 40), text: 'বৃহস্পতিবার বিকেলে বাবার ডাক্তারের অ্যাপয়েন্টমেন্ট। আমি নিয়ে যাব।' },
      { id: 'n2', elderId: 'baba', by: 'shumon', at: Y(21, 30), text: 'নতুন ওষুধের প্যাকেট আলমারির দ্বিতীয় তাকে রাখা আছে।' },
      { id: 'n3', elderId: 'ma', by: 'shumon', at: Y(20, 10), text: 'মা আজ বিকেলে পার্কে হাঁটতে গিয়েছিলেন, ভালো ছিলেন।' },
    ],
  };
}
