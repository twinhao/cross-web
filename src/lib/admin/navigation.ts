import { validDate, addDateDays } from './scheduling.ts';

/** 轉換同一院所各操作視角的日期與人員，保留返回時的原篩選。 */
export function workspaceParams(current: URLSearchParams, from: string, to: string, today: string): URLSearchParams {
  const params = new URLSearchParams(current);
  params.set('tab', to);
  params.delete('appointment');
  params.delete('new');
  const sourceDate = from === 'today' ? today : validDate(params.get('start'), today);
  if (to === 'schedule' && from !== 'schedule' && (['today', 'appointments'].includes(from) || !params.has('month'))) {
    params.set('month', sourceDate.slice(0, 7));
    const staff = params.get('staff');
    if (staff) params.set('schedule_staff', staff);
    else params.delete('schedule_staff');
  }
  if (to === 'appointments' && from === 'schedule') {
    const month = params.get('month');
    if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      const start = sourceDate.startsWith(month) ? sourceDate : `${month}-01`;
      const previousEnd = validDate(params.get('end'), start);
      params.set('start', start);
      params.set('end', params.get('view') === 'week' ? addDateDays(start, 6) : previousEnd >= start && previousEnd.startsWith(month) ? previousEnd : start);
    }
    const staff = params.get('schedule_staff');
    if (staff) params.set('staff', staff);
    else params.delete('staff');
  }
  if (to === 'queue' && ['today', 'appointments'].includes(from)) params.set('queue_date', sourceDate);
  return params;
}
