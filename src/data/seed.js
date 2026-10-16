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

// ---------- a week of history (days -6 to -2), so the summary can show patterns ----------
const D = (day, h, m) => day * 24 * 60 + h * 60 + m;
const SLOT_AT = { b1: ['baba', 'morning', 8, 0], b2: ['baba', 'noon', 13, 0], b3: ['baba', 'night', 21, 0], m1: ['ma', 'noon', 13, 0], m2: ['ma', 'night', 20, 45] };
const MISSED_BEFORE = new Set(['b2@-4@noon', 'b3@-3@night', 'm2@-3@night']);
const OLDER_DOSES = {};
for (const day of [-6, -5, -4, -3, -2]) {
  for (const [rid, [elderId, slot, h, m]] of Object.entries(SLOT_AT)) {
    const key = `${rid}@${day}@${slot}`;
    const at = D(day, h, m);
    OLDER_DOSES[key] = MISSED_BEFORE.has(key)
      ? { status: 'missed', at: at + 30, how: 'none' }
      : { status: 'taken', at: at + ((day * 7 + h) % 6 + 6) % 6 + 2, how: 'voice', by: elderId };
  }
}
// Ma's as-needed Napa Extra on earlier days
OLDER_DOSES['m3@-5@prn-' + D(-5, 15, 10)] = { status: 'taken', at: D(-5, 15, 10), how: 'button', by: 'ma' };
OLDER_DOSES['m3@-2@prn-' + D(-2, 11, 40)] = { status: 'taken', at: D(-2, 11, 40), how: 'button', by: 'ma' };

// Afternoon check-ins: feeling = good | unwell | pain; walk / water / sleep = true (yes) | false (no) | null (no answer)
const CI = (elderId, day, feeling, walk, water, sleep, said = {}) => [`${elderId}@${day}`, { at: D(day, 16, 6), how: 'voice', answers: { feeling, walk, water, sleep }, said }];
const CHECKINS = Object.fromEntries([
  CI('baba', -6, 'good', true, true, true),
  CI('baba', -5, 'good', true, false, true),
  CI('baba', -4, 'unwell', false, true, false, { feeling: 'শরীরটা একটু দুর্বল লাগছে' }),
  CI('baba', -3, 'pain', false, true, false, { feeling: 'হাঁটুতে ব্যথা করছে' }),
  CI('baba', -2, 'good', true, true, true),
  CI('baba', -1, 'pain', true, true, false, { feeling: 'হাঁটুতে একটু ব্যথা' }),
  CI('ma', -6, 'good', false, false, true),
  CI('ma', -5, 'good', true, false, true),
  CI('ma', -4, 'good', false, true, true),
  CI('ma', -3, 'unwell', false, false, false, { feeling: 'মাথাটা একটু ভার লাগছে' }),
  CI('ma', -2, 'good', true, true, true),
  CI('ma', -1, 'good', false, false, true),
]);

// Alerts from those earlier missed doses, already handled and resolved.
const PAST = (id, elderId, key, at, text, by) => ({
  id, elderId, kind: 'missed', text, doseKeys: [key], createdAt: at, ladder: true, level: 0,
  handledBy: by, handledAt: at + 6, resolvedAt: at + 25, seenBy: [by], told: true, handlingTold: true, unreachable: false,
});
const PAST_ALERTS = [
  PAST('past1', 'baba', 'b2@-4@noon', D(-4, 13, 30), 'বাবা দুপুরের ওষুধের উত্তর দেননি (Angilock Plus, দুপুর ১:০০)।', 'shumon'),
  PAST('past2', 'baba', 'b3@-3@night', D(-3, 21, 30), 'বাবা রাতের ওষুধের উত্তর দেননি (Rosuva 10, রাত ৯:০০)।', 'ruma'),
  PAST('past3', 'ma', 'm2@-3@night', D(-3, 21, 15), 'মা রাতের ওষুধের উত্তর দেননি (Calbo-D, রাত ৮:৪৫)।', 'shumon'),
];

export function makeSeed() {
  return {
    version: 13,
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
          { id: 'b1', medId: 'comet', amount: 1, stock: 20, refillDays: 5, slots: ['morning'], meal: 'after', duration: { type: 'ongoing' }, asNeeded: false, status: 'active', startDay: -7, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx1.png' },
          { id: 'b2', medId: 'angilock', amount: 1, stock: 6, refillDays: 5, slots: ['noon'], meal: 'after', duration: { type: 'ongoing' }, asNeeded: false, status: 'active', startDay: -7, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx1.png' },
          { id: 'b3', medId: 'rosuva', amount: 1, stock: 25, refillDays: 5, slots: ['night'], meal: 'after', duration: { type: 'ongoing' }, asNeeded: false, status: 'active', startDay: -7, verifiedBy: 'shumon', rxPhoto: null },
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
          { id: 'm1', medId: 'osartil', amount: 1, stock: 18, refillDays: 5, slots: ['noon'], meal: 'before', duration: { type: 'ongoing' }, asNeeded: false, status: 'active', startDay: -7, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx2.png' },
          { id: 'm2', medId: 'calbo-d', amount: 1, stock: 12, refillDays: 5, slots: ['night'], meal: 'after', duration: { type: 'weeks', count: 4 }, asNeeded: false, status: 'active', startDay: -7, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx2.png' },
          { id: 'm3', medId: 'napa-extra', amount: 1, stock: 8, refillDays: 3, slots: [], meal: 'after', duration: { type: 'ongoing' }, asNeeded: true, minGapHours: 6, maxPerDay: 3, status: 'active', startDay: -7, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx2.png' },
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
