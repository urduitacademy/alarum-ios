import AlarumAlarmKitModule from './src/AlarumAlarmKitModule';

export type AlarmKitAuthorizationState =
  | 'authorized'
  | 'denied'
  | 'notDetermined'
  | 'unsupported'
  | 'unknown';

export type ScheduleAlarmInput = {
  id: string;
  title: string;
  scheduledAt: string;
  snoozeMinutes?: number;
};

export async function getAuthorizationState(): Promise<AlarmKitAuthorizationState> {
  return AlarumAlarmKitModule.getAuthorizationState();
}

export async function requestAuthorization(): Promise<AlarmKitAuthorizationState> {
  return AlarumAlarmKitModule.requestAuthorization();
}

export async function scheduleAlarm(input: ScheduleAlarmInput): Promise<{ id: string; state: string }> {
  return AlarumAlarmKitModule.scheduleAlarm(input);
}

export async function cancelAlarm(id: string): Promise<void> {
  return AlarumAlarmKitModule.cancelAlarm(id);
}

export async function cancelAllAlarms(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => cancelAlarm(id)));
}
