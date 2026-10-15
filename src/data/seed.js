// Seed (sample) data for the demo. "Reset demo" restores exactly this.
// All people and schedules here are synthetic, for the presentation only.

export const START_CLOCK = 7 * 60 + 50; // day 0, 07:50 (10 minutes before Baba's morning dose)

export function makeSeed() {
  return {
    version: 1,
    clock: START_CLOCK,
    elderOnPhone: 'baba', // which elder the elder phone is showing

    caregivers: [
      { id: 'shumon', name: 'শুমন', nameEn: 'Shumon', relation: 'ছেলে', photo: '/img/shumon.png', primary: true },
      { id: 'ruma', name: 'রুমা', nameEn: 'Ruma', relation: 'মেয়ে', photo: null, primary: false },
    ],

    elders: [
      {
        id: 'baba',
        name: 'বাবা',
        nameEn: 'Baba',
        photo: '/img/baba.png',
        meals: { breakfast: '07:45', lunch: '12:45', dinner: '20:45' },
        sleep: '22:30',
        alertOrder: ['shumon', 'ruma'],
        regimens: [
          { id: 'b1', medId: 'comet', dose: '১টি ট্যাবলেট', slots: ['morning'], meal: 'after', duration: { type: 'ongoing' }, asNeeded: false, status: 'active', startDay: 0, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx1.png' },
          { id: 'b2', medId: 'angilock', dose: '১টি ট্যাবলেট', slots: ['noon'], meal: 'after', duration: { type: 'ongoing' }, asNeeded: false, status: 'active', startDay: 0, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx1.png' },
          { id: 'b3', medId: 'rosuva', dose: '১টি ট্যাবলেট', slots: ['night'], meal: 'after', duration: { type: 'ongoing' }, asNeeded: false, status: 'active', startDay: 0, verifiedBy: 'shumon', rxPhoto: null },
        ],
      },
      {
        id: 'ma',
        name: 'মা',
        nameEn: 'Ma',
        photo: '/img/ma.png',
        meals: { breakfast: '08:00', lunch: '13:30', dinner: '20:30' },
        sleep: '22:00',
        alertOrder: ['shumon', 'ruma'],
        regimens: [
          { id: 'm1', medId: 'osartil', dose: '১টি ট্যাবলেট', slots: ['noon'], meal: 'before', duration: { type: 'ongoing' }, asNeeded: false, status: 'active', startDay: 0, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx2.png' },
          { id: 'm2', medId: 'calbo-d', dose: '১টি ট্যাবলেট', slots: ['night'], meal: 'after', duration: { type: 'weeks', count: 4 }, asNeeded: false, status: 'active', startDay: 0, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx2.png' },
          { id: 'm3', medId: 'napa-extra', dose: '১টি ট্যাবলেট', slots: [], meal: 'after', duration: { type: 'ongoing' }, asNeeded: true, minGapHours: 6, maxPerDay: 3, status: 'active', startDay: 0, verifiedBy: 'shumon', rxPhoto: '/img/rx/rx2.png' },
        ],
      },
    ],

    // What happened, newest last. Each entry: { at, elderId, text, by }
    log: [],
    // Shared notes between caregivers, per elder.
    notes: [],
  };
}
