import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var notificationManager: NotificationManager

    var body: some View {
        NavigationStack {
            ZStack {
                Color.alarumGraphite
                    .ignoresSafeArea()

                VStack(alignment: .leading, spacing: 24) {
                    header
                    statusCard
                    actionButtons
                    Spacer()
                    footer
                }
                .padding(24)
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Alarum")
                .font(.system(size: 40, weight: .medium, design: .rounded))
                .foregroundStyle(Color.alarumChalk)

            Text("Feasibility build")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(Color.alarumSteel)

            Text("This tiny app proves notification permission, sound delivery, and TestFlight install before the full alarm UI is built.")
                .font(.system(size: 14))
                .foregroundStyle(Color.alarumSteel)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 8)
        }
    }

    private var statusCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            statusRow(title: "Notifications", value: notificationManager.authorizationDescription)
            statusRow(title: "Last action", value: notificationManager.lastActionMessage)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.alarumSlate)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var actionButtons: some View {
        VStack(spacing: 12) {
            Button {
                Task {
                    await notificationManager.requestAuthorization()
                }
            } label: {
                Text("Allow notifications")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(PrimaryButtonStyle())

            Button {
                Task {
                    await notificationManager.scheduleOneMinuteSoundTest()
                }
            } label: {
                Text("Schedule 1-minute sound test")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SecondaryButtonStyle())
        }
    }

    private func statusRow(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.alarumSteel)

            Text(value)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(Color.alarumChalk)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var footer: some View {
        Text("Alarum uses iOS notifications. It cannot fully override Silent Mode like the built-in Clock.")
            .font(.system(size: 11))
            .foregroundStyle(Color.alarumSteel)
            .fixedSize(horizontal: false, vertical: true)
    }
}

private struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .medium))
            .foregroundStyle(Color.alarumGraphite)
            .padding(.vertical, 16)
            .background(Color.alarumSodium.opacity(configuration.isPressed ? 0.82 : 1))
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

private struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .medium))
            .foregroundStyle(Color.alarumChalk)
            .padding(.vertical, 16)
            .background(Color.alarumSlate.opacity(configuration.isPressed ? 0.7 : 1))
            .overlay {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(Color.alarumSteel.opacity(0.35), lineWidth: 0.5)
            }
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

private extension Color {
    static let alarumGraphite = Color(red: 27 / 255, green: 30 / 255, blue: 36 / 255)
    static let alarumSlate = Color(red: 37 / 255, green: 42 / 255, blue: 50 / 255)
    static let alarumChalk = Color(red: 242 / 255, green: 243 / 255, blue: 245 / 255)
    static let alarumSteel = Color(red: 110 / 255, green: 118 / 255, blue: 130 / 255)
    static let alarumSodium = Color(red: 255 / 255, green: 194 / 255, blue: 75 / 255)
}

#Preview {
    ContentView()
        .environmentObject(NotificationManager())
}

