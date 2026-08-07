import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const ALARM_CATEGORY = 'alarumAlarm';
const ACTION_SNOOZE = 'snooze';
const ACTION_STOP = 'stop';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
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
        await scheduleNotification(5 * 60, 'Alarum snooze', 'Snoozed for 5 minutes.');
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

  const canSchedule = useMemo(() => {
    return permissionState.includes('granted') || permissionState.includes('authorized');
  }, [permissionState]);

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

  async function scheduleOneMinuteTest() {
    const permissions = await Notifications.getPermissionsAsync();

    if (!permissions.granted) {
      Alert.alert('Allow notifications first', 'Tap Allow notifications before scheduling.');
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
    await scheduleNotification(60, 'Alarum test', 'This is the 1-minute sound notification test.');
    await scheduleNotification(5 * 60, 'Alarum test reminder', 'Nag notification at +5 minutes.');
    await scheduleNotification(10 * 60, 'Alarum test reminder', 'Nag notification at +10 minutes.');
    setLastAction('Scheduled main alert plus +5 and +10 minute nag alerts.');
    await refreshScheduledCount();
  }

  async function scheduleNotification(seconds: number, title: string, body: string) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        interruptionLevel: 'timeSensitive',
        categoryIdentifier: ALARM_CATEGORY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
  }

  async function cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    setLastAction('All pending notifications cancelled.');
    await refreshScheduledCount();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Alarum</Text>
          <Text style={styles.subtitle}>Expo/EAS feasibility build</Text>
          <Text style={styles.body}>
            This build tests whether Expo can deliver our TestFlight pipeline and iOS local
            notification behavior from Windows.
          </Text>
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
            label="Schedule 1-minute sound test"
            onPress={scheduleOneMinuteTest}
            disabled={!canSchedule}
          />
          <ActionButton label="Cancel pending tests" onPress={cancelAll} />
          <ActionButton label="Refresh status" onPress={refreshStatus} />
        </View>

        <Text style={styles.footer}>
          Alarum uses iOS notifications. It cannot fully override Silent Mode like the built-in
          Clock.
        </Text>
      </View>
    </SafeAreaView>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1B1E24',
  },
  container: {
    flex: 1,
    gap: 24,
    padding: 24,
    backgroundColor: '#1B1E24',
  },
  header: {
    gap: 8,
  },
  title: {
    color: '#F2F3F5',
    fontSize: 40,
    fontWeight: '500',
  },
  subtitle: {
    color: '#6E7682',
    fontSize: 16,
    fontWeight: '500',
  },
  body: {
    marginTop: 8,
    color: '#6E7682',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    gap: 8,
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#252A32',
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
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
    backgroundColor: 'rgba(110, 118, 130, 0.35)',
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(110, 118, 130, 0.55)',
    backgroundColor: '#252A32',
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
    marginTop: 'auto',
    color: '#6E7682',
    fontSize: 11,
    lineHeight: 16,
  },
});

