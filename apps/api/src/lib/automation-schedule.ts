import { getDatabaseClients } from '@nexor/database';

const db = getDatabaseClients().write;

export type AutomationScheduleRow = {
  id: string;
  cron: string | null;
  run_at: Date | string | null;
  timezone: string | null;
};

/** Advance supported recurring schedules after a run. Unknown cron forms are completed. */
export function nextRunAt(schedule: AutomationScheduleRow, from = new Date()): Date | null {
  if (!schedule.cron) return null;

  const cron = schedule.cron.trim();
  const parts = cron.split(/\s+/);
  if (parts.length !== 5) return null;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const next = new Date(from);
  next.setSeconds(0, 0);

  const everyMinute = minute.match(/^\*\/([1-9]\d*)$/);
  if (everyMinute && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    next.setMinutes(next.getMinutes() + Number(everyMinute[1]));
    return next;
  }

  if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  }

  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    next.setHours(Number(hour), Number(minute), 0, 0);
    if (next <= from) next.setDate(next.getDate() + 1);
    return next;
  }

  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dayOfMonth === '*' && month === '*' && /^\d+$/.test(dayOfWeek)) {
    next.setHours(Number(hour), Number(minute), 0, 0);
    const targetDay = Number(dayOfWeek) % 7;
    let delta = (targetDay - next.getDay() + 7) % 7;
    if (delta === 0 && next <= from) delta = 7;
    next.setDate(next.getDate() + delta);
    return next;
  }

  return null;
}

export async function advanceAutomationSchedule(schedule: AutomationScheduleRow): Promise<void> {
  const next = nextRunAt(schedule, new Date());

  if (!next) {
    await db.$executeRawUnsafe(
      `UPDATE "public"."automation_schedules"
       SET "status"='COMPLETED',"next_run_at"=NULL,"updated_at"=NOW()
       WHERE "id"=$1::uuid`,
      schedule.id,
    );
    return;
  }

  await db.$executeRawUnsafe(
    `UPDATE "public"."automation_schedules"
     SET "next_run_at"=$1,"updated_at"=NOW()
     WHERE "id"=$2::uuid AND "status"='ACTIVE'`,
    next,
    schedule.id,
  );
}
