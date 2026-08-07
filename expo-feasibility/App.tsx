import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  describeRepeatConfirmation,
  getNextOccurrence,
  getTallyStrokes,
  getUpcomingOccurrences,
} from './src/alarms/occurrenceCalculator';
import type { Alarm, AlarmLimit, Weekday } from './src/alarms/types';

const ALARM_CATEGORY = 'alarumAlarm';
const ACTION_SNOOZE = 'snooze';
const ACTION_STOP = 'stop';
const MAX_PENDING_NOTIFICATIONS = 50;

type Screen = 'list' | 'edit';
type DraftAlarm = {
  id?: string;
  label: string;
  date: Date;
  repeatWeekdays: Weekday[];
  limit: AlarmLimit;
  sound: boolean;
  vibrationAndFlash: boolean;
  enabled: boolean;
};

const initialAlarms: Alarm[] = [
  makeAlarm({
    id: 'gym-two-fridays',
    label: 'Gym',
    date: nextWeekdayAt(5, 9, 0),
    repeatWeekdays: [5],
    limit: { kind: 'count', occurrences: 2 },
  }),
  makeAlarm({
    id: 'dentist-once',
    label: 'Dentist',
    date: addHours(new Date(), 3),
    repeatWeekdays: [],
    limit: { kind: 'once' },
  }),
];

const weekdayOptions: Array<{ label: string; longLabel: string; value: Weekday }> = [
  { label: 'M', longLabel: 'Monday', value: 1 },
  { label: 'T', longLabel: 'Tuesday', value: 2 },
  { label: 'W', longLabel: 'Wednesday', value: 3 },
  { label: 'T', longLabel: 'Thursday', value: 4 },
  { label: 'F', longLabel: 'Friday', value: 5 },
  { label: 'S', longLabel: 'Saturday', value: 6 },
  { label: 'S', longLabel: 'Sunday', value: 0 },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [screen, setScreen] = useState<Screen>('list');
  const [alarms, setAlarms] = useState<Alarm[]>(initialAlarms);
  const [draft, setDraft] = useState<DraftAlarm>(() => createDraft());
  const [permissionState, setPermissionState] = useState('Not checked');
  const [lastAction, setLastAction] = useState('Ready');
  const [scheduledCount, setScheduledCount] = useState(0);

  useEffect(() => {
    refreshStatus();
    registerAlarmCategory();

    const received = Notifications.addNotificationReceivedListener((notification) => {
      setLastAction(`Received: ${notification.request.content.title ?? 'notification'}`);
    });

    const response = Notifications.addNotificationResponseReceivedListener(async (event) => {
      if (event.actionIdentifier === ACTION_STOP) {
        await Notifications.cancelAllScheduledNotificationsAsync();
        setLastAction('Stop action received. Pending notifications cancelled.');
        await refreshScheduledCount();
        return;
      }

      if (event.actionIdentifier === ACTION_SNOOZE) {
        await scheduleNotification({
          identifier: `alarum.snooze.${Date.now()}`,
          seconds: 5 * 60,
          title: 'Alarum snooze',
          body: 'Snoozed for 5 minutes.',
          sound: true,
        });
        setLastAction('Snooze action received. New 5-minute notification scheduled.');
        await refreshScheduledCount();
        return;
      }

      setLastAction('Notification opened.');
    });

    return () => {
      received.remove();
      response.remove();
    };
  }, []);

  const sortedAlarms = useMemo(() => {
    return [...alarms].sort((a, b) => {
      const aNext = getNextOccurrence(a)?.scheduledAt ?? '9999-12-31T00:00:00.000Z';
      const bNext = getNextOccurrence(b)?.scheduledAt ?? '9999-12-31T00:00:00.000Z';
      return aNext.localeCompare(bNext);
    });
  }, [alarms]);

  const nextAlarm = sortedAlarms.find((alarm) => getNextOccurrence(alarm));
  const canSchedule = permissionState.includes('granted') || permissionState.includes('authorized');

  async function refreshStatus() {
    const permissions = await Notifications.getPermissionsAsync();
    const iosStatus = permissions.ios?.status;
    setPermissionState(
      `status=${permissions.status}; granted=${permissions.granted}; ios=${iosStatus ?? 'n/a'}`
    );
    await refreshScheduledCount();
  }

  async function refreshScheduledCount() {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    setScheduledCount(scheduled.length);
  }

  async function registerAlarmCategory() {
    await Notifications.setNotificationCategoryAsync(ALARM_CATEGORY, [
      {
        identifier: ACTION_SNOOZE,
        buttonTitle: 'Snooze 5 min',
        options: {
          opensAppToForeground: true,
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: ACTION_STOP,
        buttonTitle: 'Stop',
        options: {
          opensAppToForeground: true,
          isDestructive: true,
          isAuthenticationRequired: false,
        },
      },
    ]);
  }

  async function requestPermissions() {
    const result = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    setPermissionState(
      `status=${result.status}; granted=${result.granted}; ios=${result.ios?.status ?? 'n/a'}`
    );
    setLastAction(result.granted ? 'Notifications allowed.' : 'Notifications not allowed.');
  }

  async function reconcileSchedule(nextAlarms: Alarm[]) {
    const permissions = await Notifications.getPermissionsAsync();

    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!permissions.granted) {
      setLastAction('Alarms saved. Notifications are not allowed yet.');
      await refreshScheduledCount();
      return;
    }

    let pending = 0;

    for (const alarm of nextAlarms) {
      const occurrences = getUpcomingOccurrences(alarm, { maxOccurrences: 4 });

      for (const occurrence of occurrences) {
        if (pending >= MAX_PENDING_NOTIFICATIONS) {
          break;
        }

        const seconds = secondsUntil(new Date(occurrence.scheduledAt));

        if (seconds <= 0) {
          continue;
        }

        await scheduleNotification({
          identifier: `alarum.${alarm.id}.${occurrence.occurrenceIndex}`,
          seconds,
          title: alarm.label || 'Alarum',
          body: formatOccurrenceBody(alarm, occurrence.scheduledAt),
          sound: alarm.alertPreferences.sound,
        });
        pending += 1;

        for (const minute of [5, 10]) {
          if (pending >= MAX_PENDING_NOTIFICATIONS) {
            break;
          }

          await scheduleNotification({
            identifier: `alarum.${alarm.id}.${occurrence.occurrenceIndex}.nag.${minute}`,
            seconds: seconds + minute * 60,
            title: `${alarm.label || 'Alarum'} reminder`,
            body: `Nag alert at +${minute} minutes.`,
            sound: alarm.alertPreferences.sound,
          });
          pending += 1;
        }
      }
    }

    setLastAction(`Scheduled ${pending} notification${pending === 1 ? '' : 's'}.`);
    await refreshScheduledCount();
  }

  async function scheduleNotification({
    identifier,
    seconds,
    title,
    body,
    sound,
  }: {
    identifier: string;
    seconds: number;
    title: string;
    body: string;
    sound: boolean;
  }) {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        sound: sound ? 'default' : undefined,
        interruptionLevel: 'timeSensitive',
        categoryIdentifier: ALARM_CATEGORY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
  }

  function openNewAlarm() {
    setDraft(createDraft());
    setScreen('edit');
  }

  function openEditAlarm(alarm: Alarm) {
    setDraft({
      id: alarm.id,
      label: alarm.label,
      date: new Date(alarm.startAt),
      repeatWeekdays: alarm.repeatWeekdays,
      limit: alarm.limit,
      sound: alarm.alertPreferences.sound,
      vibrationAndFlash: alarm.alertPreferences.vibrationAndFlash,
      enabled: alarm.enabled,
    });
    setScreen('edit');
  }

  async function saveDraft() {
    const now = new Date().toISOString();
    const cleanRepeatWeekdays = [...new Set(draft.repeatWeekdays)].sort((a, b) => a - b);
    const id = draft.id ?? `alarm-${Date.now()}`;
    const nextAlarmValue: Alarm = {
      id,
      label: draft.label.trim() || 'Alarm',
      startAt: draft.date.toISOString(),
      repeatWeekdays: cleanRepeatWeekdays,
      limit: cleanRepeatWeekdays.length === 0 ? { kind: 'once' } : draft.limit,
      firedCount: 0,
      enabled: draft.enabled,
      alertPreferences: {
        sound: draft.sound,
        vibrationAndFlash: draft.vibrationAndFlash,
      },
      createdAt: alarms.find((alarm) => alarm.id === id)?.createdAt ?? now,
      updatedAt: now,
    };

    const nextAlarms = alarms.some((alarm) => alarm.id === id)
      ? alarms.map((alarm) => (alarm.id === id ? nextAlarmValue : alarm))
      : [...alarms, nextAlarmValue];

    setAlarms(nextAlarms);
    setScreen('list');
    await reconcileSchedule(nextAlarms);
  }

  async function deleteDraft() {
    if (!draft.id) {
      setScreen('list');
      return;
    }

    const nextAlarms = alarms.filter((alarm) => alarm.id !== draft.id);
    setAlarms(nextAlarms);
    setScreen('list');
    await reconcileSchedule(nextAlarms);
  }

  async function toggleAlarm(alarmId: string) {
    const nextAlarms = alarms.map((alarm) =>
      alarm.id === alarmId ? { ...alarm, enabled: !alarm.enabled, updatedAt: new Date().toISOString() } : alarm
    );
    setAlarms(nextAlarms);
    await reconcileSchedule(nextAlarms);
  }

  async function skipNext(alarmId: string) {
    const nextAlarms = alarms.map((alarm) =>
      alarm.id === alarmId
        ? { ...alarm, firedCount: alarm.firedCount + 1, updatedAt: new Date().toISOString() }
        : alarm
    );
    setAlarms(nextAlarms);
    await reconcileSchedule(nextAlarms);
  }

  async function cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    setLastAction('All pending notifications cancelled.');
    await refreshScheduledCount();
  }

  if (screen === 'edit') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.navRow}>
            <Pressable onPress={() => setScreen('list')} hitSlop={12}>
              <Text style={styles.navAction}>Cancel</Text>
            </Pressable>
            <Text style={styles.navTitle}>{draft.id ? 'Edit alarm' : 'New alarm'}</Text>
            <Pressable onPress={saveDraft} hitSlop={12}>
              <Text style={styles.saveAction}>Save</Text>
            </Pressable>
          </View>

          <View style={styles.timePanel}>
            <Text style={styles.formLabel}>Time</Text>
            <Text style={styles.editTime}>{formatTime(draft.date)}</Text>
            <View style={styles.stepperGrid}>
              <StepperButton label="-1 hour" onPress={() => setDraftDate(addHours(draft.date, -1))} />
              <StepperButton label="+1 hour" onPress={() => setDraftDate(addHours(draft.date, 1))} />
              <StepperButton label="-5 min" onPress={() => setDraftDate(addMinutes(draft.date, -5))} />
              <StepperButton label="+5 min" onPress={() => setDraftDate(addMinutes(draft.date, 5))} />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.formLabel}>Date</Text>
            <Text style={styles.cardValue}>{formatLongDate(draft.date)}</Text>
            <View style={styles.stepperGrid}>
              <StepperButton label="-1 day" onPress={() => setDraftDate(addDays(draft.date, -1))} />
              <StepperButton label="+1 day" onPress={() => setDraftDate(addDays(draft.date, 1))} />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.formLabel}>Label</Text>
            <TextInput
              value={draft.label}
              onChangeText={(label) => setDraft((current) => ({ ...current, label }))}
              placeholder="Dentist"
              placeholderTextColor="#6E7682"
              style={styles.input}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.formLabel}>Repeat</Text>
            <View style={styles.weekdayRow}>
              {weekdayOptions.map((weekday) => {
                const selected = draft.repeatWeekdays.includes(weekday.value);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={weekday.longLabel}
                    key={weekday.longLabel}
                    onPress={() => toggleDraftWeekday(weekday.value)}
                    style={[styles.weekdayChip, selected && styles.weekdayChipSelected]}
                  >
                    <Text style={[styles.weekdayText, selected && styles.weekdayTextSelected]}>{weekday.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {draft.repeatWeekdays.length > 0 ? (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.formLabel}>Limit</Text>
                <View style={styles.inlineSwitch}>
                  <Text style={styles.metaText}>Forever</Text>
                  <Switch
                    value={draft.limit.kind === 'forever'}
                    onValueChange={(forever) =>
                      setDraft((current) => ({
                        ...current,
                        limit: forever ? { kind: 'forever' } : { kind: 'count', occurrences: 2 },
                      }))
                    }
                    trackColor={{ false: '#D3D6DC', true: '#FFC24B' }}
                    thumbColor={draft.limit.kind === 'forever' ? '#1B1E24' : '#6E7682'}
                  />
                </View>
              </View>

              {draft.limit.kind === 'count' ? (
                <LimitCountControl occurrences={draft.limit.occurrences} setDraftLimit={setDraftLimit} />
              ) : (
                <Text style={styles.infinity}>∞</Text>
              )}

              <Text style={styles.confirmationText}>{describeDraftConfirmation(draft)}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <PreferenceRow
              title="Sound"
              subtitle="Primary alert"
              value={draft.sound}
              onValueChange={(sound) => setDraft((current) => ({ ...current, sound }))}
            />
            <View style={styles.divider} />
            <PreferenceRow
              title="Vibration and flash"
              subtitle="Uses iOS notification behavior and device settings"
              value={draft.vibrationAndFlash}
              onValueChange={(vibrationAndFlash) => setDraft((current) => ({ ...current, vibrationAndFlash }))}
            />
          </View>

          {draft.id ? (
            <Pressable style={styles.deleteButton} onPress={deleteDraft}>
              <Text style={styles.deleteButtonText}>Delete alarm</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Alarms</Text>
            <Text style={styles.subtitle}>Alarms with an end date</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={openNewAlarm} style={styles.addButton}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>

        <View style={styles.segmented}>
          <View style={styles.segmentActive}>
            <Text style={styles.segmentActiveText}>List</Text>
          </View>
          <View style={styles.segment}>
            <Text style={styles.segmentText}>Calendar</Text>
          </View>
        </View>

        {nextAlarm ? <NextUpCard alarm={nextAlarm} onPress={() => openEditAlarm(nextAlarm)} /> : <EmptyState />}

        <View style={styles.listCard}>
          {sortedAlarms.map((alarm, index) => (
            <AlarmRow
              alarm={alarm}
              key={alarm.id}
              last={index === sortedAlarms.length - 1}
              onPress={() => openEditAlarm(alarm)}
              onSkip={() => skipNext(alarm.id)}
              onToggle={() => toggleAlarm(alarm.id)}
            />
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Notifications</Text>
          <Text style={styles.cardValue}>{permissionState}</Text>
          <View style={styles.divider} />
          <Text style={styles.cardLabel}>Scheduled notifications</Text>
          <Text style={styles.cardValue}>{scheduledCount}</Text>
          <View style={styles.divider} />
          <Text style={styles.cardLabel}>Last action</Text>
          <Text style={styles.cardValue}>{lastAction}</Text>
        </View>

        <View style={styles.actions}>
          <ActionButton label="Allow notifications" onPress={requestPermissions} primary />
          <ActionButton
            label="Schedule saved alarms"
            onPress={() => reconcileSchedule(alarms)}
            disabled={!canSchedule}
          />
          <ActionButton label="Cancel pending tests" onPress={cancelAll} />
          <ActionButton label="Refresh status" onPress={refreshStatus} />
        </View>

        <Text style={styles.footer}>
          Alarum uses iOS notifications. It cannot fully override Silent Mode like the built-in Clock.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );

  function setDraftDate(date: Date) {
    setDraft((current) => ({ ...current, date: clampFutureDate(date) }));
  }

  function toggleDraftWeekday(weekday: Weekday) {
    setDraft((current) => {
      const selected = current.repeatWeekdays.includes(weekday);
      const repeatWeekdays = selected
        ? current.repeatWeekdays.filter((value) => value !== weekday)
        : [...current.repeatWeekdays, weekday];

      return {
        ...current,
        repeatWeekdays,
        limit: repeatWeekdays.length === 0 && current.limit.kind !== 'once' ? { kind: 'once' } : current.limit,
      };
    });
  }

  function setDraftLimit(occurrences: number) {
    setDraft((current) => ({ ...current, limit: { kind: 'count', occurrences } }));
  }
}

function NextUpCard({ alarm, onPress }: { alarm: Alarm; onPress: () => void }) {
  const next = getNextOccurrence(alarm);

  if (!next) {
    return null;
  }

  const date = new Date(next.scheduledAt);

  return (
    <Pressable onPress={onPress} style={styles.nextCard}>
      <View style={styles.nextAccent} />
      <Text style={styles.nextTime}>{formatTime(date)}</Text>
      <Text style={styles.nextDate}>{formatLongDate(date)}</Text>
      <Text style={styles.nextLabel}>{alarm.label}</Text>
      <Text style={styles.metaText}>{formatCountdown(date)}</Text>
    </Pressable>
  );
}

function AlarmRow({
  alarm,
  last,
  onPress,
  onSkip,
  onToggle,
}: {
  alarm: Alarm;
  last: boolean;
  onPress: () => void;
  onSkip: () => void;
  onToggle: () => void;
}) {
  const next = getNextOccurrence(alarm);
  const nextDate = next ? new Date(next.scheduledAt) : null;

  return (
    <Pressable onPress={onPress} style={[styles.alarmRow, !last && styles.rowBorder]}>
      <View style={styles.timeColumn}>
        <Text style={styles.rowTime}>{nextDate ? formatTime(nextDate) : '--:--'}</Text>
        <Text style={styles.rowDate}>{nextDate ? formatShortDate(nextDate) : 'Ended'}</Text>
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{alarm.label}</Text>
        <Pressable onPress={onSkip} hitSlop={10} style={styles.tallyRow}>
          <Tally alarm={alarm} />
        </Pressable>
      </View>

      <Switch
        value={alarm.enabled}
        onValueChange={onToggle}
        trackColor={{ false: '#D3D6DC', true: '#FFC24B' }}
        thumbColor={alarm.enabled ? '#1B1E24' : '#6E7682'}
      />
    </Pressable>
  );
}

function Tally({ alarm }: { alarm: Alarm }) {
  if (alarm.limit.kind === 'forever') {
    return <Text style={styles.infinitySmall}>∞</Text>;
  }

  const strokes = getTallyStrokes(alarm);

  if (strokes.length === 0) {
    return null;
  }

  if (strokes.length > 6) {
    return (
      <View style={styles.tallyRow}>
        {strokes.slice(0, 4).map((stroke) => (
          <View key={stroke.index} style={[styles.tallyStroke, styles[`tally_${stroke.state}`]]} />
        ))}
        <Text style={styles.tallyOverflow}>x{strokes.length}</Text>
      </View>
    );
  }

  return (
    <View style={styles.tallyRow}>
      {strokes.map((stroke) => (
        <View key={stroke.index} style={styles.tallyStack}>
          <View style={[styles.tallyStroke, styles[`tally_${stroke.state}`]]} />
          {stroke.state === 'fired' ? <View style={styles.tallyStrike} /> : null}
        </View>
      ))}
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyMark}>A</Text>
      <Text style={styles.emptyTitle}>No alarms yet.</Text>
      <Text style={styles.emptyCopy}>Set one for a date - this Friday, the 14th, whenever.</Text>
    </View>
  );
}

function PreferenceRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceCopy}>
        <Text style={styles.preferenceTitle}>{title}</Text>
        <Text style={styles.preferenceSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#D3D6DC', true: '#FFC24B' }}
        thumbColor={value ? '#1B1E24' : '#6E7682'}
      />
    </View>
  );
}

function LimitCountControl({
  occurrences,
  setDraftLimit,
}: {
  occurrences: number;
  setDraftLimit: (occurrences: number) => void;
}) {
  return (
    <View style={styles.limitRow}>
      <StepperButton label="-" onPress={() => setDraftLimit(Math.max(1, occurrences - 1))} />
      <View style={styles.tallyCreateRow}>
        {Array.from({ length: Math.min(occurrences, 6) }, (_, index) => (
          <Pressable key={index} onPress={() => setDraftLimit(index + 1)} style={styles.tallyTapArea}>
            <View style={styles.tallyLarge} />
          </Pressable>
        ))}
        {occurrences > 6 ? <Text style={styles.tallyOverflow}>x{occurrences}</Text> : null}
      </View>
      <StepperButton label="+" onPress={() => setDraftLimit(occurrences + 1)} />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  primary,
  disabled,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primaryButton : styles.secondaryButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, primary ? styles.primaryButtonText : styles.secondaryButtonText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function StepperButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}>
      <Text style={styles.stepperText}>{label}</Text>
    </Pressable>
  );
}

function makeAlarm({
  id,
  label,
  date,
  repeatWeekdays,
  limit,
}: {
  id: string;
  label: string;
  date: Date;
  repeatWeekdays: Weekday[];
  limit: AlarmLimit;
}): Alarm {
  const now = new Date().toISOString();
  return {
    id,
    label,
    startAt: date.toISOString(),
    repeatWeekdays,
    limit,
    firedCount: 0,
    enabled: true,
    alertPreferences: { sound: true, vibrationAndFlash: true },
    createdAt: now,
    updatedAt: now,
  };
}

function createDraft(): DraftAlarm {
  return {
    label: '',
    date: addMinutes(new Date(), 5),
    repeatWeekdays: [],
    limit: { kind: 'count', occurrences: 2 },
    sound: true,
    vibrationAndFlash: true,
    enabled: true,
  };
}

function describeDraftConfirmation(draft: DraftAlarm): string {
  const alarm = makeAlarm({
    id: draft.id ?? 'draft',
    label: draft.label || 'Alarm',
    date: draft.date,
    repeatWeekdays: draft.repeatWeekdays,
    limit: draft.repeatWeekdays.length === 0 ? { kind: 'once' } : draft.limit,
  });
  return describeRepeatConfirmation(alarm);
}

function nextWeekdayAt(weekday: Weekday, hour: number, minute: number): Date {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  const daysAhead = (weekday - target.getDay() + 7) % 7;
  const next = addDays(target, daysAhead === 0 && target <= now ? 7 : daysAhead);
  return next;
}

function clampFutureDate(date: Date): Date {
  const minimum = addMinutes(new Date(), 1);
  return date < minimum ? minimum : date;
}

function secondsUntil(date: Date): number {
  return Math.max(1, Math.round((date.getTime() - Date.now()) / 1000));
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addHours(date: Date, hours: number): Date {
  return addMinutes(date, hours * 60);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function formatCountdown(date: Date): string {
  const totalMinutes = Math.max(0, Math.round((date.getTime() - Date.now()) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `in ${days} day${days === 1 ? '' : 's'}, ${hours} hour${hours === 1 ? '' : 's'}`;
  }

  if (hours > 0) {
    return `in ${hours} hour${hours === 1 ? '' : 's'}, ${minutes} min`;
  }

  return `in ${minutes} min`;
}

function formatOccurrenceBody(alarm: Alarm, scheduledAt: string): string {
  return `${formatLongDate(new Date(scheduledAt))}. ${alarm.alertPreferences.vibrationAndFlash ? 'Vibration and flash on.' : 'Sound only.'}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1B1E24',
  },
  scrollContainer: {
    gap: 20,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: '#1B1E24',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#F2F3F5',
    fontSize: 28,
    fontWeight: '500',
  },
  subtitle: {
    color: '#6E7682',
    fontSize: 13,
    marginTop: 4,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#FFC24B',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  addButtonText: {
    color: '#1B1E24',
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 30,
  },
  segmented: {
    backgroundColor: '#252A32',
    borderRadius: 10,
    flexDirection: 'row',
    padding: 3,
  },
  segmentActive: {
    alignItems: 'center',
    backgroundColor: '#1B1E24',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 10,
  },
  segment: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 10,
  },
  segmentActiveText: {
    color: '#F2F3F5',
    fontSize: 13,
  },
  segmentText: {
    color: '#6E7682',
    fontSize: 13,
  },
  nextCard: {
    backgroundColor: '#252A32',
    borderRadius: 14,
    overflow: 'hidden',
    padding: 20,
  },
  nextAccent: {
    backgroundColor: '#FFC24B',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 3,
  },
  nextTime: {
    color: '#FFC24B',
    fontSize: 40,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  nextDate: {
    color: '#F2F3F5',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  nextLabel: {
    color: '#6E7682',
    fontSize: 13,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#252A32',
    borderRadius: 14,
    gap: 8,
    padding: 18,
  },
  listCard: {
    backgroundColor: '#252A32',
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  cardHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: '#6E7682',
    fontSize: 13,
    fontWeight: '500',
  },
  cardValue: {
    color: '#F2F3F5',
    fontSize: 15,
    lineHeight: 21,
  },
  divider: {
    backgroundColor: 'rgba(110, 118, 130, 0.35)',
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
  },
  alarmRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    minHeight: 72,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomColor: 'rgba(110, 118, 130, 0.35)',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeColumn: {
    width: 74,
  },
  rowTime: {
    color: '#F2F3F5',
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  rowDate: {
    color: '#6E7682',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  rowBody: {
    flex: 1,
    gap: 8,
  },
  rowLabel: {
    color: '#F2F3F5',
    fontSize: 13,
  },
  tallyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    minHeight: 20,
  },
  tallyStack: {
    height: 20,
    justifyContent: 'center',
    width: 8,
  },
  tallyStroke: {
    borderRadius: 2,
    height: 18,
    width: 2,
  },
  tally_fired: {
    backgroundColor: '#6E7682',
  },
  tally_next: {
    backgroundColor: '#FFC24B',
  },
  tally_remaining: {
    backgroundColor: '#F2F3F5',
  },
  tallyStrike: {
    backgroundColor: '#6E7682',
    height: 2,
    position: 'absolute',
    transform: [{ rotate: '-38deg' }],
    width: 14,
  },
  tallyOverflow: {
    color: '#6E7682',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  infinitySmall: {
    color: '#6E7682',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 44,
  },
  emptyMark: {
    color: 'rgba(110, 118, 130, 0.35)',
    fontSize: 54,
    fontWeight: '500',
  },
  emptyTitle: {
    color: '#F2F3F5',
    fontSize: 16,
  },
  emptyCopy: {
    color: '#6E7682',
    fontSize: 13,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
  button: {
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 16,
  },
  primaryButton: {
    backgroundColor: '#FFC24B',
  },
  secondaryButton: {
    backgroundColor: '#252A32',
    borderColor: 'rgba(110, 118, 130, 0.55)',
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  primaryButtonText: {
    color: '#1B1E24',
  },
  secondaryButtonText: {
    color: '#F2F3F5',
  },
  footer: {
    color: '#6E7682',
    fontSize: 11,
    lineHeight: 16,
  },
  navRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navAction: {
    color: '#6E7682',
    fontSize: 16,
  },
  navTitle: {
    color: '#F2F3F5',
    fontSize: 16,
    fontWeight: '500',
  },
  saveAction: {
    color: '#FFC24B',
    fontSize: 16,
    fontWeight: '500',
  },
  timePanel: {
    alignItems: 'center',
    backgroundColor: '#252A32',
    borderRadius: 14,
    gap: 14,
    padding: 18,
  },
  formLabel: {
    alignSelf: 'flex-start',
    color: '#6E7682',
    fontSize: 13,
    fontWeight: '500',
  },
  editTime: {
    color: '#F2F3F5',
    fontSize: 48,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  stepperGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stepperButton: {
    alignItems: 'center',
    borderColor: 'rgba(110, 118, 130, 0.55)',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 84,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stepperText: {
    color: '#F2F3F5',
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    borderBottomColor: 'rgba(110, 118, 130, 0.35)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    color: '#F2F3F5',
    fontSize: 16,
    paddingVertical: 10,
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: 6,
  },
  weekdayChip: {
    alignItems: 'center',
    borderColor: 'rgba(110, 118, 130, 0.55)',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    height: 38,
    justifyContent: 'center',
  },
  weekdayChipSelected: {
    backgroundColor: '#FFC24B',
    borderColor: '#FFC24B',
  },
  weekdayText: {
    color: '#6E7682',
    fontSize: 13,
    fontWeight: '500',
  },
  weekdayTextSelected: {
    color: '#1B1E24',
  },
  inlineSwitch: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  metaText: {
    color: '#6E7682',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  limitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  tallyCreateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
  },
  tallyTapArea: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 18,
  },
  tallyLarge: {
    backgroundColor: '#F2F3F5',
    borderRadius: 2,
    height: 34,
    width: 3,
  },
  infinity: {
    color: '#6E7682',
    fontSize: 28,
    fontVariant: ['tabular-nums'],
  },
  confirmationText: {
    color: '#6E7682',
    fontSize: 13,
    lineHeight: 19,
  },
  preferenceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  preferenceCopy: {
    flex: 1,
  },
  preferenceTitle: {
    color: '#F2F3F5',
    fontSize: 16,
    fontWeight: '500',
  },
  preferenceSubtitle: {
    color: '#6E7682',
    fontSize: 11,
    marginTop: 4,
  },
  deleteButton: {
    alignItems: 'center',
    borderColor: '#C2402F',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  deleteButtonText: {
    color: '#C2402F',
    fontSize: 16,
    fontWeight: '500',
  },
});
