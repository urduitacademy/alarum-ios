export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type AlarmLimit =
  | { kind: 'once' }
  | { kind: 'count'; occurrences: number }
  | { kind: 'forever' };

export type AlertPreferences = {
  sound: boolean;
  vibrationAndFlash: boolean;
};

export type Alarm = {
  id: string;
  label: string;
  startAt: string;
  repeatWeekdays: Weekday[];
  limit: AlarmLimit;
  firedCount: number;
  enabled: boolean;
  alertPreferences: AlertPreferences;
  createdAt: string;
  updatedAt: string;
};

export type AlarmOccurrence = {
  alarmId: string;
  scheduledAt: string;
  occurrenceIndex: number;
  isNext: boolean;
  isFired: boolean;
};

export type TallyState = 'fired' | 'next' | 'remaining';

export type TallyStroke = {
  index: number;
  state: TallyState;
};

