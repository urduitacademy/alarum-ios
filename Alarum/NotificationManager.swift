import Foundation
import UserNotifications

@MainActor
final class NotificationManager: NSObject, ObservableObject {
    @Published private(set) var authorizationDescription = "Not checked"
    @Published private(set) var lastActionMessage = "Ready"

    private let center = UNUserNotificationCenter.current()

    override init() {
        super.init()
        center.delegate = self
        registerActions()
    }

    func refreshAuthorizationStatus() async {
        let settings = await center.notificationSettings()
        authorizationDescription = description(for: settings.authorizationStatus)
    }

    func requestAuthorization() async {
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
            await refreshAuthorizationStatus()
            lastActionMessage = granted ? "Notifications allowed" : "Notifications not allowed"
        } catch {
            lastActionMessage = "Permission request failed: \(error.localizedDescription)"
        }
    }

    func scheduleOneMinuteSoundTest() async {
        let settings = await center.notificationSettings()

        guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional || settings.authorizationStatus == .ephemeral else {
            lastActionMessage = "Allow notifications first"
            return
        }

        let content = UNMutableNotificationContent()
        content.title = "Alarum test"
        content.body = "This is the 1-minute sound notification test."
        content.sound = .default
        content.categoryIdentifier = NotificationCategory.alarm
        content.interruptionLevel = .timeSensitive

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 60, repeats: false)
        let request = UNNotificationRequest(identifier: "alarum.test.main", content: content, trigger: trigger)

        do {
            try await center.add(request)
            try await scheduleNagNotifications()
            lastActionMessage = "Test scheduled for 1 minute from now"
        } catch {
            lastActionMessage = "Schedule failed: \(error.localizedDescription)"
        }
    }

    private func scheduleNagNotifications() async throws {
        for minute in [5, 10] {
            let content = UNMutableNotificationContent()
            content.title = "Alarum test reminder"
            content.body = "Nag notification at +\(minute) minutes."
            content.sound = .default
            content.categoryIdentifier = NotificationCategory.alarm
            content.interruptionLevel = .timeSensitive

            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: TimeInterval(minute * 60), repeats: false)
            let request = UNNotificationRequest(identifier: "alarum.test.nag.\(minute)", content: content, trigger: trigger)
            try await center.add(request)
        }
    }

    private func registerActions() {
        let snooze = UNNotificationAction(
            identifier: NotificationAction.snooze,
            title: "Snooze 5 min",
            options: []
        )

        let stop = UNNotificationAction(
            identifier: NotificationAction.stop,
            title: "Stop",
            options: [.destructive]
        )

        let category = UNNotificationCategory(
            identifier: NotificationCategory.alarm,
            actions: [snooze, stop],
            intentIdentifiers: [],
            options: []
        )

        center.setNotificationCategories([category])
    }

    private func description(for status: UNAuthorizationStatus) -> String {
        switch status {
        case .notDetermined:
            return "Not requested"
        case .denied:
            return "Denied"
        case .authorized:
            return "Allowed"
        case .provisional:
            return "Provisional"
        case .ephemeral:
            return "Ephemeral"
        @unknown default:
            return "Unknown"
        }
    }
}

extension NotificationManager: UNUserNotificationCenterDelegate {
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .list]
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        switch response.actionIdentifier {
        case NotificationAction.snooze:
            await MainActor.run {
                self.lastActionMessage = "Snooze action received"
            }
        case NotificationAction.stop:
            center.removePendingNotificationRequests(withIdentifiers: [
                "alarum.test.main",
                "alarum.test.nag.5",
                "alarum.test.nag.10"
            ])
            await MainActor.run {
                self.lastActionMessage = "Stop action received"
            }
        default:
            await MainActor.run {
                self.lastActionMessage = "Notification opened"
            }
        }
    }
}

private enum NotificationCategory {
    static let alarm = "ALARUM_ALARM"
}

private enum NotificationAction {
    static let snooze = "ALARUM_SNOOZE"
    static let stop = "ALARUM_STOP"
}
