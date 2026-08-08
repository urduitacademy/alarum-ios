import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
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
import * as AlarmKit from './modules/alarum-alarmkit';

const ALARM_CATEGORY = 'alarumAlarm';
const ACTION_SNOOZE = 'snooze';
const ACTION_STOP = 'stop';
const MAX_PENDING_NOTIFICATIONS = 50;
const MAX_ALARM_DURATION_MINUTES = 15;
const SNOOZE_MINUTES = 5;
const WHEEL_ITEM_HEIGHT = 44;
const WHEEL_VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS;
const DARK = '#1B1E24';
const PANEL = '#252A32';
const TEXT = '#F2F3F5';
const MUTED = '#6E7682';
const YELLOW = '#FFC24B';
const BORDER = 'rgba(110, 118, 130, 0.35)';
const DANGER = '#D3422F';

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

type WheelOption = {
  label: string;
  value: number;
};

const initialAlarms: Alarm[] = [
  makeAlarm({
    id: '00000000-0000-4000-8000-000000000001',
    label: 'Gym',
    date: nextWeekdayAt(5, 9, 0),
    repeatWeekdays: [5],
    limit: { kind: 'count', occurrences: 2 },
  }),
  makeAlarm({
    id: '00000000-0000-4000-8000-000000000002',
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

const hours = Array.from({ length: 24 }, (_, value) => ({
  label: value.toString().padStart(2, '0'),
  value,
}));

const minutes = Array.from({ length: 60 }, (_, value) => ({
  label: value.toString().padStart(2, '0'),
  value,
}));

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
  const [nativeAlarmState, setNativeAlarmState] = useState<string>('Checking AlarmKit');

  useEffect(() => {
    registerAlarmCategory();
    AlarmKit.getAuthorizationState()
      .then((state) => setNativeAlarmState(formatAlarmKitState(state)))
      .catch(() => setNativeAlarmState('AlarmKit unavailable'));

    const response = Notifications.addNotificationResponseReceivedListener(async (event) => {
      const notificationId = event.notification.request.identifier;

      if (event.actionIdentifier === ACTION_STOP) {
        await cancelNotificationBurst(notificationId);
        return;
      }

      if (event.actionIdentifier === ACTION_SNOOZE) {
        await cancelNotificationBurst(notificationId);
        await scheduleNotificationBurst({
          idPrefix: `alarum.snooze.${Date.now()}`,
          baseSeconds: SNOOZE_MINUTES * 60,
          title: 'Alarum snooze',
          body: 'Snoozed for 5 minutes.',
          sound: true,
          remainingSlots: MAX_ALARM_DURATION_MINUTES + 1,
        });
      }
    });

    return () => {
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

  async function ensureNotificationPermission() {
    const current = await Notifications.getPermissionsAsync();

    if (current.granted) {
      return true;
    }

    const result = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    if (!result.granted) {
      Alert.alert(
        'Notifications are off',
        'Alarum can save the alarm, but iOS will not show or sound it until notifications are allowed.'
      );
    }

    return result.granted;
  }

  async function ensureAlarmKitAuthorization() {
    try {
      const current = await AlarmKit.getAuthorizationState();

      if (current === 'authorized') {
        setNativeAlarmState('AlarmKit authorized');
        return true;
      }

      if (current === 'unsupported') {
        setNativeAlarmState('AlarmKit requires iOS 26');
        return false;
      }

      const next = await AlarmKit.requestAuthorization();
      setNativeAlarmState(formatAlarmKitState(next));
      return next === 'authorized';
    } catch (error) {
      setNativeAlarmState('AlarmKit unavailable');
      return false;
    }
  }

  async function reconcileSchedule(nextAlarms: Alarm[]) {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (await ensureAlarmKitAuthorization()) {
      await reconcileAlarmKitSchedule(nextAlarms);
      return;
    }

    const permissions = await Notifications.getPermissionsAsync();

    if (!permissions.granted && !(await ensureNotificationPermission())) {
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

        const scheduled = await scheduleNotificationBurst({
          idPrefix: `alarum.${alarm.id}.${occurrence.occurrenceIndex}`,
          baseSeconds: seconds,
          title: alarm.label || 'Alarum',
          body: formatOccurrenceBody(alarm, occurrence.scheduledAt),
          sound: alarm.alertPreferences.sound,
          remainingSlots: MAX_PENDING_NOTIFICATIONS - pending,
        });

        pending += scheduled;
      }
    }
  }

  async function reconcileAlarmKitSchedule(nextAlarms: Alarm[]) {
    await Promise.all(alarms.map((alarm) => AlarmKit.cancelAlarm(alarm.id).catch(() => undefined)));

    let scheduled = 0;

    for (const alarm of nextAlarms) {
      const occurrences = getUpcomingOccurrences(alarm, { maxOccurrences: 1 });
      const occurrence = occurrences[0];

      if (!occurrence) {
        continue;
      }

      await AlarmKit.scheduleAlarm({
        id: alarm.id,
        title: alarm.label || 'Alarum',
        scheduledAt: occurrence.scheduledAt,
        snoozeMinutes: SNOOZE_MINUTES,
      });
      scheduled += 1;
    }

    setNativeAlarmState(`AlarmKit scheduled ${scheduled}`);
  }

  async function scheduleNotificationBurst({
    idPrefix,
    baseSeconds,
    title,
    body,
    sound,
    remainingSlots,
  }: {
    idPrefix: string;
    baseSeconds: number;
    title: string;
    body: string;
    sound: boolean;
    remainingSlots: number;
  }) {
    let scheduled = 0;

    for (let minute = 0; minute <= MAX_ALARM_DURATION_MINUTES; minute += 1) {
      if (scheduled >= remainingSlots) {
        break;
      }

      await scheduleNotification({
        identifier: `${idPrefix}.pulse.${minute}`,
        seconds: baseSeconds + minute * 60,
        title,
        body: minute === 0 ? body : `${body} Still active. Stop or snooze from the alert.`,
        sound,
      });
      scheduled += 1;
    }

    return scheduled;
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

  async function cancelNotificationBurst(notificationId: string) {
    const [idPrefix] = notificationId.split('.pulse.');
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    await Promise.all(
      scheduled
        .filter((notification) => notification.identifier.startsWith(`${idPrefix}.pulse.`))
        .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier))
    );
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
    const id = draft.id ?? createUUID();
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

    await deleteAlarm(draft.id);
    setScreen('list');
  }

  async function deleteAlarm(alarmId: string) {
    const nextAlarms = alarms.filter((alarm) => alarm.id !== alarmId);
    setAlarms(nextAlarms);
    await reconcileSchedule(nextAlarms);
  }

  async function toggleAlarm(alarmId: string) {
    const nextAlarms = alarms.map((alarm) =>
      alarm.id === alarmId ? { ...alarm, enabled: !alarm.enabled, updatedAt: new Date().toISOString() } : alarm
    );
    setAlarms(nextAlarms);

    await reconcileSchedule(nextAlarms);
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

          <TimeWheelPanel date={draft.date} setDate={setDraftDate} />
          <DateWheelPanel date={draft.date} setDate={setDraftDate} />

          <View style={styles.card}>
            <Text style={styles.formLabel}>Label</Text>
            <TextInput
              value={draft.label}
              onChangeText={(label) => setDraft((current) => ({ ...current, label }))}
              placeholder="Dentist"
              placeholderTextColor={MUTED}
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
                  <AppSwitch
                    value={draft.limit.kind === 'forever'}
                    onValueChange={(forever) =>
                      setDraft((current) => ({
                        ...current,
                        limit: forever ? { kind: 'forever' } : { kind: 'count', occurrences: 2 },
                      }))
                    }
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
              subtitle={`Rings until Stop, up to ${MAX_ALARM_DURATION_MINUTES} minutes`}
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

        <View style={styles.nativeAlarmBanner}>
          <Text style={styles.nativeAlarmBannerTitle}>Native alarm engine</Text>
          <Text style={styles.nativeAlarmBannerText}>{nativeAlarmState}</Text>
        </View>

        <View style={styles.listCard}>
          {sortedAlarms.map((alarm, index) => (
            <SwipeDeleteRow key={alarm.id} last={index === sortedAlarms.length - 1} onDelete={() => deleteAlarm(alarm.id)}>
              <AlarmRow
                alarm={alarm}
                onPress={() => openEditAlarm(alarm)}
                onToggle={() => toggleAlarm(alarm.id)}
              />
            </SwipeDeleteRow>
          ))}
        </View>

        <Text style={styles.footer}>
          Alerts use iOS time-sensitive notifications now. Full iOS 26 AlarmKit is the native alarm path for silent-mode override.
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

function TimeWheelPanel({ date, setDate }: { date: Date; setDate: (date: Date) => void }) {
  return (
    <View style={styles.timePanel}>
      <Text style={styles.formLabel}>Time</Text>
      <Text style={styles.editTime}>{formatTime(date)}</Text>
      <View style={styles.timeWheelRow}>
        <WheelPicker
          accessibilityLabel="Hour"
          options={hours}
          value={date.getHours()}
          onChange={(hour) => setDate(withTimeParts(date, hour, date.getMinutes()))}
        />
        <Text style={styles.wheelColon}>:</Text>
        <WheelPicker
          accessibilityLabel="Minute"
          options={minutes}
          value={date.getMinutes()}
          onChange={(minute) => setDate(withTimeParts(date, date.getHours(), minute))}
        />
      </View>
    </View>
  );
}

function DateWheelPanel({ date, setDate }: { date: Date; setDate: (date: Date) => void }) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const currentYear = new Date().getFullYear();
  const dayOptions = Array.from({ length: daysInMonth(year, month) }, (_, index) => ({
    label: (index + 1).toString().padStart(2, '0'),
    value: index + 1,
  }));
  const monthOptions = Array.from({ length: 12 }, (_, value) => ({
    label: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(2026, value, 1)),
    value,
  }));
  const yearOptions = Array.from({ length: 6 }, (_, index) => ({
    label: String(currentYear + index),
    value: currentYear + index,
  }));

  function updateDate(nextYear: number, nextMonth: number, nextDay: number) {
    const safeDay = Math.min(nextDay, daysInMonth(nextYear, nextMonth));
    setDate(
      new Date(
        nextYear,
        nextMonth,
        safeDay,
        date.getHours(),
        date.getMinutes(),
        0,
        0
      )
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.formLabel}>Date</Text>
      <Text style={styles.cardValue}>{formatLongDate(date)}</Text>
      <View style={styles.dateWheelRow}>
        <WheelPicker
          accessibilityLabel="Day"
          options={dayOptions}
          value={Math.min(day, dayOptions[dayOptions.length - 1].value)}
          onChange={(nextDay) => updateDate(year, month, nextDay)}
        />
        <WheelPicker
          accessibilityLabel="Month"
          options={monthOptions}
          value={month}
          onChange={(nextMonth) => updateDate(year, nextMonth, day)}
        />
        <WheelPicker
          accessibilityLabel="Year"
          options={yearOptions}
          value={Math.max(currentYear, Math.min(year, currentYear + 5))}
          onChange={(nextYear) => updateDate(nextYear, month, day)}
        />
      </View>
    </View>
  );
}

function WheelPicker({
  accessibilityLabel,
  options,
  value,
  onChange,
}: {
  accessibilityLabel: string;
  options: WheelOption[];
  value: number;
  onChange: (value: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM_HEIGHT, animated: false });
    });
  }, [selectedIndex, options.length]);

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.max(
      0,
      Math.min(options.length - 1, Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT))
    );
    const option = options[nextIndex];

    if (option && option.value !== value) {
      onChange(option.value);
    }
  }

  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.wheel}>
      <View pointerEvents="none" style={styles.wheelSelection} />
      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={styles.wheelContent}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {options.map((option, index) => {
          const selected = index === selectedIndex;

          return (
            <Pressable
              key={`${accessibilityLabel}-${option.value}`}
              onPress={() => onChange(option.value)}
              style={styles.wheelItem}
            >
              <Text style={[styles.wheelText, selected && styles.wheelTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SwipeDeleteRow({
  children,
  last,
  onDelete,
}: {
  children: React.ReactNode;
  last: boolean;
  onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opened = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          if (gesture.dx < 0) {
            translateX.setValue(Math.max(-92, gesture.dx));
          }
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldOpen = gesture.dx < -48 || gesture.vx < -0.7;
          opened.current = shouldOpen;
          Animated.spring(translateX, {
            toValue: shouldOpen ? -92 : 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        },
      }),
    [translateX]
  );

  function closeOrDelete() {
    onDelete();
    opened.current = false;
    translateX.setValue(0);
  }

  return (
    <View style={[styles.swipeContainer, !last && styles.rowBorder]}>
      <View style={styles.deleteActionLayer}>
        <Pressable accessibilityRole="button" onPress={closeOrDelete} style={styles.swipeDeleteAction}>
          <Text style={styles.swipeDeleteText}>Delete</Text>
        </Pressable>
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.swipeContent,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
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
  onPress,
  onToggle,
}: {
  alarm: Alarm;
  onPress: () => void;
  onToggle: () => void;
}) {
  const next = getNextOccurrence(alarm);
  const nextDate = next ? new Date(next.scheduledAt) : null;

  return (
    <Pressable onPress={onPress} style={styles.alarmRow}>
      <View style={styles.timeColumn}>
        <Text style={styles.rowTime}>{nextDate ? formatTime(nextDate) : '--:--'}</Text>
        <Text style={styles.rowDate}>{nextDate ? formatShortDate(nextDate) : 'Ended'}</Text>
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{alarm.label}</Text>
        <Tally alarm={alarm} />
      </View>

      <AppSwitch value={alarm.enabled} onValueChange={onToggle} />
    </Pressable>
  );
}

function AppSwitch({ value, onValueChange }: { value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      style={[styles.appSwitch, value ? styles.appSwitchOn : styles.appSwitchOff]}
    >
      <View style={[styles.appSwitchThumb, value ? styles.appSwitchThumbOn : styles.appSwitchThumbOff]} />
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
      <AppSwitch value={value} onValueChange={onValueChange} />
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

function formatAlarmKitState(state: AlarmKit.AlarmKitAuthorizationState): string {
  switch (state) {
    case 'authorized':
      return 'AlarmKit authorized';
    case 'denied':
      return 'AlarmKit denied in iOS Settings';
    case 'notDetermined':
      return 'AlarmKit permission needed';
    case 'unsupported':
      return 'AlarmKit requires iOS 26';
    default:
      return 'AlarmKit unavailable';
  }
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
  return addDays(target, daysAhead === 0 && target <= now ? 7 : daysAhead);
}

function clampFutureDate(date: Date): Date {
  const minimum = addMinutes(new Date(), 1);
  return date < minimum ? minimum : date;
}

function secondsUntil(date: Date): number {
  return Math.max(1, Math.round((date.getTime() - Date.now()) / 1000));
}

function addMinutes(date: Date, minutesToAdd: number): Date {
  return new Date(date.getTime() + minutesToAdd * 60 * 1000);
}

function addHours(date: Date, hoursToAdd: number): Date {
  return addMinutes(date, hoursToAdd * 60);
}

function addDays(date: Date, daysToAdd: number): Date {
  return new Date(date.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
}

function withTimeParts(date: Date, hour: number, minute: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function createUUID(): string {
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0'));

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
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
  const hoursRemaining = Math.floor((totalMinutes % 1440) / 60);
  const minutesRemaining = totalMinutes % 60;

  if (days > 0) {
    return `in ${days} day${days === 1 ? '' : 's'}, ${hoursRemaining} hour${hoursRemaining === 1 ? '' : 's'}`;
  }

  if (hoursRemaining > 0) {
    return `in ${hoursRemaining} hour${hoursRemaining === 1 ? '' : 's'}, ${minutesRemaining} min`;
  }

  return `in ${minutesRemaining} min`;
}

function formatOccurrenceBody(alarm: Alarm, scheduledAt: string): string {
  return `${formatLongDate(new Date(scheduledAt))}. ${
    alarm.alertPreferences.vibrationAndFlash ? 'Vibration and flash on.' : 'Sound only.'
  }`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DARK,
  },
  scrollContainer: {
    gap: 20,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: DARK,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: TEXT,
    fontSize: 28,
    fontWeight: '500',
  },
  subtitle: {
    color: MUTED,
    fontSize: 13,
    marginTop: 4,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: YELLOW,
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  addButtonText: {
    color: DARK,
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 30,
  },
  segmented: {
    backgroundColor: PANEL,
    borderRadius: 10,
    flexDirection: 'row',
    padding: 3,
  },
  segmentActive: {
    alignItems: 'center',
    backgroundColor: DARK,
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
    color: TEXT,
    fontSize: 13,
  },
  segmentText: {
    color: MUTED,
    fontSize: 13,
  },
  nextCard: {
    backgroundColor: PANEL,
    borderRadius: 14,
    overflow: 'hidden',
    padding: 20,
  },
  nextAccent: {
    backgroundColor: YELLOW,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 3,
  },
  nextTime: {
    color: YELLOW,
    fontSize: 40,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  nextDate: {
    color: TEXT,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  nextLabel: {
    color: MUTED,
    fontSize: 13,
    marginTop: 8,
  },
  card: {
    backgroundColor: PANEL,
    borderRadius: 14,
    gap: 8,
    padding: 18,
  },
  listCard: {
    backgroundColor: PANEL,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardValue: {
    color: TEXT,
    fontSize: 15,
    lineHeight: 21,
  },
  divider: {
    backgroundColor: BORDER,
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
  },
  swipeContainer: {
    backgroundColor: DANGER,
    minHeight: 72,
    overflow: 'hidden',
  },
  deleteActionLayer: {
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    width: 92,
  },
  swipeDeleteAction: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  swipeDeleteText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '600',
  },
  swipeContent: {
    backgroundColor: PANEL,
  },
  alarmRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomColor: BORDER,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeColumn: {
    width: 74,
  },
  rowTime: {
    color: TEXT,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  rowDate: {
    color: MUTED,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  rowBody: {
    flex: 1,
    gap: 8,
  },
  rowLabel: {
    color: TEXT,
    fontSize: 13,
  },
  appSwitch: {
    borderRadius: 18,
    height: 32,
    justifyContent: 'center',
    padding: 3,
    width: 58,
  },
  appSwitchOn: {
    alignItems: 'flex-end',
    backgroundColor: YELLOW,
  },
  appSwitchOff: {
    alignItems: 'flex-start',
    backgroundColor: '#626976',
  },
  appSwitchThumb: {
    borderRadius: 13,
    height: 26,
    width: 26,
  },
  appSwitchThumbOn: {
    backgroundColor: DARK,
  },
  appSwitchThumbOff: {
    backgroundColor: TEXT,
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
    backgroundColor: MUTED,
  },
  tally_next: {
    backgroundColor: YELLOW,
  },
  tally_remaining: {
    backgroundColor: TEXT,
  },
  tallyStrike: {
    backgroundColor: MUTED,
    height: 2,
    position: 'absolute',
    transform: [{ rotate: '-38deg' }],
    width: 14,
  },
  tallyOverflow: {
    color: MUTED,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  infinitySmall: {
    color: MUTED,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 44,
  },
  emptyMark: {
    color: BORDER,
    fontSize: 54,
    fontWeight: '500',
  },
  emptyTitle: {
    color: TEXT,
    fontSize: 16,
  },
  emptyCopy: {
    color: MUTED,
    fontSize: 13,
    textAlign: 'center',
  },
  nativeAlarmBanner: {
    backgroundColor: 'rgba(255, 194, 75, 0.12)',
    borderColor: 'rgba(255, 194, 75, 0.42)',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  nativeAlarmBannerTitle: {
    color: YELLOW,
    fontSize: 12,
    fontWeight: '600',
  },
  nativeAlarmBannerText: {
    color: TEXT,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.82,
  },
  footer: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 16,
  },
  navRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navAction: {
    color: MUTED,
    fontSize: 16,
  },
  navTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '500',
  },
  saveAction: {
    color: YELLOW,
    fontSize: 16,
    fontWeight: '500',
  },
  timePanel: {
    alignItems: 'center',
    backgroundColor: PANEL,
    borderRadius: 14,
    gap: 12,
    padding: 18,
  },
  formLabel: {
    alignSelf: 'flex-start',
    color: MUTED,
    fontSize: 13,
    fontWeight: '500',
  },
  editTime: {
    color: TEXT,
    fontSize: 48,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  timeWheelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dateWheelRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 8,
  },
  wheel: {
    height: WHEEL_HEIGHT,
    overflow: 'hidden',
    width: 94,
  },
  wheelContent: {
    paddingVertical: WHEEL_ITEM_HEIGHT * 2,
  },
  wheelSelection: {
    backgroundColor: 'rgba(27, 30, 36, 0.78)',
    borderRadius: 8,
    height: WHEEL_ITEM_HEIGHT,
    left: 2,
    position: 'absolute',
    right: 2,
    top: WHEEL_ITEM_HEIGHT * 2,
  },
  wheelItem: {
    alignItems: 'center',
    height: WHEEL_ITEM_HEIGHT,
    justifyContent: 'center',
  },
  wheelText: {
    color: 'rgba(242, 243, 245, 0.34)',
    fontSize: 23,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  wheelTextSelected: {
    color: TEXT,
    fontSize: 28,
  },
  wheelColon: {
    color: TEXT,
    fontSize: 30,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    marginHorizontal: -4,
  },
  stepperButton: {
    alignItems: 'center',
    borderColor: 'rgba(110, 118, 130, 0.55)',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stepperText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    borderBottomColor: BORDER,
    borderBottomWidth: StyleSheet.hairlineWidth,
    color: TEXT,
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
    backgroundColor: YELLOW,
    borderColor: YELLOW,
  },
  weekdayText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '500',
  },
  weekdayTextSelected: {
    color: DARK,
  },
  inlineSwitch: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  metaText: {
    color: MUTED,
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
    backgroundColor: TEXT,
    borderRadius: 2,
    height: 34,
    width: 3,
  },
  infinity: {
    color: MUTED,
    fontSize: 28,
    fontVariant: ['tabular-nums'],
  },
  confirmationText: {
    color: MUTED,
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
    color: TEXT,
    fontSize: 16,
    fontWeight: '500',
  },
  preferenceSubtitle: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
  },
  deleteButton: {
    alignItems: 'center',
    borderColor: DANGER,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  deleteButtonText: {
    color: DANGER,
    fontSize: 16,
    fontWeight: '500',
  },
});
