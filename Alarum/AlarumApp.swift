import SwiftUI

@main
struct AlarumApp: App {
    @StateObject private var notificationManager = NotificationManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(notificationManager)
                .task {
                    await notificationManager.refreshAuthorizationStatus()
                }
        }
    }
}

