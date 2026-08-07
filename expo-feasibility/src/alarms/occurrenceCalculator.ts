import type { Alarm, AlarmOccurrence, TallyStroke, Weekday } from './types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function getUpcomingOccurrences(
  alarm: Alarm,
  options: { now?: Date; maxOccurrences?: number } = {}
): AlarmOccurrence[] {
  const now = options.now ?? new Date();
  const maxOccurrences = options.maxOccurrences ?? 10;

  if (!alarm.enabled || maxOccurrences <= 0) {
    return [];
  }

  if (alarm.limit.kind === 'once') {
    const scheduledAt = new Date(alarm.startAt);

    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt < now || alarm.firedCount > 0) {
      return [];
    }

    return [
      {
        alarmId: alarm.id,
        scheduledAt: scheduledAt.toISOString(),
        occurrenceIndex: 0,
        isNext: true,
        isFired: false,
      },
    ];
  }

  const weekdays = normalizeWeekdays(alarm.repeatWeekdays);

  if (weekdays.length === 0) {
    return [];
  }

  const totalCount = alarm.limit.kind === 'count' ? alarm.limit.occurrences : Number.POSITIVE_INFINITY;
  const remainingCount = Math.max(0, totalCount - alarm.firedCount);
  const countToGenerate = Math.min(maxOccurrences, remainingCount);

  if (countToGenerate === 0) {
    return [];
  }

  const occurrences: AlarmOccurrence[] = [];
  const startAt = new Date(alarm.startAt);

  if (Number.isNaN(startAt.getTime())) {
    return [];
  }

  let cursor = startOfDay(startAt);
  const endGuard = addDays(startOfDay(now), 366 * 5);
  let occurrenceIndex = 0;

  while (cursor <= endGuard && occurrences.length < countToGenerate) {
    const candidate = withTime(cursor, startAt);

    if (candidate >= startAt && weekdays.includes(toWeekday(candidate))) {
      const alreadyFired = occurrenceIndex < alarm.firedCount;

      if (!alreadyFired && candidate >= now) {
        occurrences.push({
          alarmId: alarm.id,
          scheduledAt: candidate.toISOString(),
          occurrenceIndex,
          isNext: occurrences.length === 0,
          isFired: false,
        });
      }

      occurrenceIndex += 1;

      if (occurrenceIndex >= totalCount) {
        break;
      }
    }

    cursor = addDays(cursor, 1);
  }

  return occurrences;
}

export function getNextOccurrence(alarm: Alarm, now: Date = new Date()): AlarmOccurrence | null {
  return getUpcomingOccurrences(alarm, { now, maxOccurrences: 1 })[0] ?? null;
}

export function getTallyStrokes(alarm: Alarm): TallyStroke[] {
  if (alarm.limit.kind !== 'count') {
    return [];
  }

  return Array.from({ length: alarm.limit.occurrences }, (_, index) => {
    let state: TallyStroke['state'] = 'remaining';

    if (index < alarm.firedCount) {
      state = 'fired';
    } else if (index === alarm.firedCount) {
      state = 'next';
    }

    return { index, state };
  });
}

export function describeRepeatConfirmation(alarm: Alarm): string {
  if (alarm.limit.kind === 'once' || alarm.repeatWeekdays.length === 0) {
    return `${formatLongDate(new Date(alarm.startAt))} only.`;
  }

  const weekdayNames = normalizeWeekdays(alarm.repeatWeekdays).map(formatWeekday);
  const weekdayCopy = joinList(weekdayNames);

  if (alarm.limit.kind === 'forever') {
    return `Every ${weekdayCopy}, with no end date.`;
  }

  const occurrences = getUpcomingOccurrences(alarm, {
    now: new Date(alarm.startAt),
    maxOccurrences: alarm.limit.occurrences,
  });

  if (occurrences.length === 1) {
    return `${formatLongDate(new Date(occurrences[0].scheduledAt))} only.`;
  }

  if (occurrences.length <= 3) {
    return `${joinList(occurrences.map((occurrence) => formatLongDate(new Date(occurrence.scheduledAt))))} only.`;
  }

  const finalOccurrence = occurrences[occurrences.length - 1];
  return `The next ${occurrences.length} ${pluralizeWeekday(weekdayCopy)}, ending ${formatLongDate(
    new Date(finalOccurrence.scheduledAt)
  )}.`;
}

export function toWeekday(date: Date): Weekday {
  return date.getDay() as Weekday;
}

function normalizeWeekdays(weekdays: Weekday[]): Weekday[] {
  return [...new Set(weekdays)].sort((a, b) => a - b);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * ONE_DAY_MS);
}

function withTime(date: Date, timeSource: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds(),
    0
  );
}

function formatWeekday(weekday: Weekday): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekday];
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function joinList(values: string[]): string {
  if (values.length <= 1) {
    return values[0] ?? '';
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
}

function pluralizeWeekday(weekdayCopy: string): string {
  if (weekdayCopy.includes(' and ') || weekdayCopy.includes(',')) {
    return 'occurrences';
  }

  return `${weekdayCopy}s`;
}

