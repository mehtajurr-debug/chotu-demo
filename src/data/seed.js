// Seed (sample) data for the demo. "Reset demo" restores exactly this.
// All people and schedules here are synthetic, for the presentation only.

export const START_CLOCK = 7 * 60 + 50; // day 0, 07:50 (10 minutes before Baba's morning dose)

export function makeSeed() {
  return {
    version: 3,
    clock: START_CLOCK,
    elderOnPhone: 'baba', // which elder the elder phone is showing
    caregiverOnPhone: 'shumon', // who is holding the caregiver phone

    caregivers: [
      { id: 'shumon', name: 'শুমন', gen: 'শুমনের', nameEn: 'Shumon', relation: 'ছেলে', photo: '/img/shumon.png', primary: true },
      { id: 'ruma', name: 'রুমা', gen: 'রুমার', nameEn: 'Ruma', relation: 'মেয়ে', photo: null, primary: false },
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
        alertOrder: ['shumon', 'ruma'],
        regimens: [
          { id: 'b1', medId: 'comet', amount: 1, slots: ['morning'], meal: 'after', duration: { type: 'ongoing' }, asNeeded: false, status: 'active', startDay: 0, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx1.png' },
          { id: 'b2', medId: 'angilock', amount: 1, slots: ['noon'], meal: 'after', duration: { type: 'ongoing' }, asNeeded: false, status: 'active', startDay: 0, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx1.png' },
          { id: 'b3', medId: 'rosuva', amount: 1, slots: ['night'], meal: 'after', duration: { type: 'ongoing' }, asNeeded: false, status: 'active', startDay: 0, verifiedBy: 'shumon', rxPhoto: null },
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
        alertOrder: ['shumon', 'ruma'],
        regimens: [
          { id: 'm1', medId: 'osartil', amount: 1, slots: ['noon'], meal: 'before', duration: { type: 'ongoing' }, asNeeded: false, status: 'active', startDay: 0, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx2.png' },
          { id: 'm2', medId: 'calbo-d', amount: 1, slots: ['night'], meal: 'after', duration: { type: 'weeks', count: 4 }, asNeeded: false, status: 'active', startDay: 0, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx2.png' },
          { id: 'm3', medId: 'napa-extra', amount: 1, slots: [], meal: 'after', duration: { type: 'ongoing' }, asNeeded: true, minGapHours: 6, maxPerDay: 3, status: 'active', startDay: 0, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx2.png' },
        ],
      },
    ],

    // What happened, newest last. Each entry: { at, elderId, text, by }
    log: [],
    // Medicines the caregiver typed in that are not in the library: { id, name, short, bn, strength, form, image }
    customMeds: [],
    // Shared notes between caregivers, per elder.
    notes: [],
  };
}
