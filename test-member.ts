import { isPlanActive } from './packages/supabase/src/utils/member';
import { toTimezoneYYYYMMDD } from './packages/supabase/src/utils/date';

const plan = {
  updated_at: '2026-10-07T00:39:00.000Z',
  created_at: '2026-10-07T00:39:00.000Z',
  visits_purchased: 1,
  visits_used: 1,
  expiration_date: '2026-10-08T00:00:00.000Z',
  status: 'active' as any
};

const appDate = new Date('2026-10-07T14:35:00.000-06:00'); // current time in Nicaragua

console.log("appDateStr:", toTimezoneYYYYMMDD(appDate));
console.log("updatedAtStr:", toTimezoneYYYYMMDD(plan.updated_at));
console.log("isUpdatedToday:", toTimezoneYYYYMMDD(plan.updated_at) === toTimezoneYYYYMMDD(appDate));

console.log("isPlanActive?", isPlanActive(plan, appDate));
