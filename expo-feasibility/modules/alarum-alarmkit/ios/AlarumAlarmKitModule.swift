import ExpoModulesCore
import Foundation

#if canImport(AlarmKit)
import AlarmKit
import SwiftUI
#endif

public class AlarumAlarmKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AlarumAlarmKit")

    AsyncFunction("getAuthorizationState") { () -> String in
      return Self.authorizationState()
    }

    AsyncFunction("requestAuthorization") { () async throws -> String in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        let state = try await AlarmManager.shared.requestAuthorization()
        return Self.authorizationStateString(state)
      }
      #endif

      return "unsupported"
    }

    AsyncFunction("scheduleAlarm") { (input: [String: Any]) async throws -> [String: String] in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        guard let id = input["id"] as? String, !id.isEmpty else {
          throw AlarumAlarmKitError.invalidInput("Missing alarm id.")
        }

        guard let title = input["title"] as? String, !title.isEmpty else {
          throw AlarumAlarmKitError.invalidInput("Missing alarm title.")
        }

        guard let scheduledAt = input["scheduledAt"] as? String else {
          throw AlarumAlarmKitError.invalidInput("Missing scheduledAt.")
        }

        guard let date = ISO8601DateFormatter.alarum.date(from: scheduledAt) else {
          throw AlarumAlarmKitError.invalidInput("scheduledAt must be an ISO-8601 date.")
        }

        let currentState = AlarmManager.shared.authorizationState
        let authorizedState: AlarmManager.AuthorizationState

        switch currentState {
        case .authorized:
          authorizedState = currentState
        case .notDetermined:
          authorizedState = try await AlarmManager.shared.requestAuthorization()
        default:
          throw AlarumAlarmKitError.notAuthorized(Self.authorizationStateString(currentState))
        }

        guard case .authorized = authorizedState else {
          throw AlarumAlarmKitError.notAuthorized(Self.authorizationStateString(authorizedState))
        }

        let uuid = UUID(uuidString: id) ?? UUID()
        let snoozeMinutes = input["snoozeMinutes"] as? Int ?? 5
        let countdownDuration = Alarm.CountdownDuration(
          preAlert: 0,
          postAlert: TimeInterval(max(1, snoozeMinutes) * 60)
        )
        let stopButton = AlarmButton(
          text: "Stop",
          textColor: .white,
          systemImageName: "stop.circle"
        )
        let snoozeButton = AlarmButton(
          text: "Snooze",
          textColor: .white,
          systemImageName: "clock"
        )
        let alertPresentation = AlarmPresentation.Alert(
          title: LocalizedStringResource(stringLiteral: title),
          stopButton: stopButton,
          secondaryButton: snoozeButton,
          secondaryButtonBehavior: .countdown
        )
        let attributes = AlarmAttributes<AlarumAlarmMetadata>(
          presentation: AlarmPresentation(alert: alertPresentation),
          metadata: AlarumAlarmMetadata(label: title),
          tintColor: Color.orange
        )
        typealias Configuration = AlarmManager.AlarmConfiguration<AlarumAlarmMetadata>
        let configuration = Configuration(
          countdownDuration: countdownDuration,
          schedule: .fixed(date),
          attributes: attributes
        )
        let alarm = try await AlarmManager.shared.schedule(id: uuid, configuration: configuration)

        return [
          "id": alarm.id.uuidString,
          "state": String(describing: alarm.state)
        ]
      }
      #endif

      throw AlarumAlarmKitError.unsupported
    }

    AsyncFunction("cancelAlarm") { (id: String) throws -> Void in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        guard let uuid = UUID(uuidString: id) else {
          throw AlarumAlarmKitError.invalidInput("Alarm id must be a UUID.")
        }

        try AlarmManager.shared.cancel(id: uuid)
        return
      }
      #endif

      throw AlarumAlarmKitError.unsupported
    }
  }

  private static func authorizationState() -> String {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      return authorizationStateString(AlarmManager.shared.authorizationState)
    }
    #endif

    return "unsupported"
  }

  #if canImport(AlarmKit)
  @available(iOS 26.0, *)
  private static func authorizationStateString(_ state: AlarmManager.AuthorizationState) -> String {
    switch state {
    case .authorized:
      return "authorized"
    case .denied:
      return "denied"
    case .notDetermined:
      return "notDetermined"
    @unknown default:
      return "unknown"
    }
  }
  #endif
}

#if canImport(AlarmKit)
@available(iOS 26.0, *)
struct AlarumAlarmMetadata: AlarmMetadata {
  let label: String
}
#endif

enum AlarumAlarmKitError: Error {
  case invalidInput(String)
  case notAuthorized(String)
  case unsupported
}

extension AlarumAlarmKitError: LocalizedError {
  var errorDescription: String? {
    switch self {
    case .invalidInput(let message):
      return message
    case .notAuthorized(let state):
      return "AlarmKit is not authorized: \(state)."
    case .unsupported:
      return "AlarmKit requires iOS 26 or later."
    }
  }
}

extension ISO8601DateFormatter {
  static let alarum: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()
}
