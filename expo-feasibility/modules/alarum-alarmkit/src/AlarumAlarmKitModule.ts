import { NativeModule, requireNativeModule } from 'expo-modules-core';

import type { AlarmKitAuthorizationState, ScheduleAlarmInput } from '..';

declare class AlarumAlarmKitNativeModule extends NativeModule {
  getAuthorizationState(): Promise<AlarmKitAuthorizationState>;
  requestAuthorization(): Promise<AlarmKitAuthorizationState>;
  scheduleAlarm(input: ScheduleAlarmInput): Promise<{ id: string; state: string }>;
  cancelAlarm(id: string): Promise<void>;
}

export default requireNativeModule<AlarumAlarmKitNativeModule>('AlarumAlarmKit');
