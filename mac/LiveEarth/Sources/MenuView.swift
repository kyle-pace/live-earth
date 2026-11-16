import ServiceManagement
import SwiftUI

/// Everything Live Earth does, in the menu bar window.
struct MenuView: View {
    @ObservedObject var earth: LiveEarth
    @State private var asked = Analytics.choice != nil
    @State private var sharing = Analytics.choice == true

    private static let time: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .none
        f.timeStyle = .short
        return f
    }()

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            header
            picture
            choices
            Divider()
            settings
            if !asked { usageQuestion }
            Divider()
            footer
        }
        .padding(14)
        .frame(width: 320)
        .font(Fonts.text(.body))
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            Text("Live Earth").font(Fonts.text(.headline, weight: "Bold"))
            Spacer()
            Button {
                Task { await earth.update(trigger: "button") }
            } label: {
                Label(earth.usesDesktop ? "Update now" : "Refresh", systemImage: "arrow.clockwise")
            }
            .disabled(earth.status == .loading)
            .help(earth.usesDesktop ? "Get the newest picture and set it now" : "Get the newest picture")
        }
    }

    private var picture: some View {
        VStack(alignment: .leading, spacing: 4) {
            ZStack {
                RoundedRectangle(cornerRadius: 8).fill(.black)
                if let preview = earth.preview {
                    Image(nsImage: preview).resizable().aspectRatio(contentMode: .fit)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                if earth.status == .loading && earth.preview == nil {
                    ProgressView().controlSize(.small)
                }
            }
            .frame(height: 180)
            .accessibilityElement()
            .accessibilityLabel("Satellite picture: \(earth.view.label) from \(earth.satellite.name)")
            .accessibilityAddTraits(.isImage)

            Group {
                switch earth.status {
                case .failed(let message):
                    Text(message).foregroundStyle(.red)
                case .loading:
                    Text("Getting the newest picture…").foregroundStyle(.secondary)
                case .idle:
                    if let scan = earth.scan {
                        Text("\(earth.satellite.name), scan from \(Self.time.string(from: scan))").foregroundStyle(.secondary)
                    }
                }
            }
            .font(Fonts.text(.caption))
            .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var choices: some View {
        VStack(alignment: .leading, spacing: 8) {
            Picker("Satellite", selection: Binding(get: { earth.satellite.id }, set: { earth.choose(satellite: $0) })) {
                ForEach(Catalog.satellites) { Text($0.name).tag($0.id) }
            }
            Picker("View", selection: Binding(get: { earth.view.id }, set: { earth.choose(view: $0) })) {
                ForEach(earth.satellite.views) { Text($0.label).tag($0.id) }
            }
        }
        .pickerStyle(.menu)
    }

    private var settings: some View {
        VStack(alignment: .leading, spacing: 8) {
            Toggle("Use as desktop picture", isOn: $earth.usesDesktop)
            Picker("Update every", selection: $earth.minutes) {
                ForEach(LiveEarth.intervals, id: \.self) { Text("\($0) minutes").tag($0) }
            }
            .pickerStyle(.menu)
            .disabled(!earth.usesDesktop)
            Toggle("Open at login", isOn: Binding(get: { earth.opensAtLogin }, set: { earth.setOpensAtLogin($0) }))
            if asked {
                Toggle("Share anonymous usage data", isOn: Binding(get: { sharing }, set: {
                    sharing = $0
                    Analytics.setSharing($0)
                }))
            }
        }
        .toggleStyle(.switch)
        .controlSize(.small)
    }

    private var usageQuestion: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Share anonymous usage data?").font(Fonts.text(.body, weight: "SemiBold"))
            Text("Which views and settings get used, so I know what to improve. Never your location or anything on your Mac.")
                .font(Fonts.text(.caption)).foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            HStack {
                Button("Share") { answer(true) }.keyboardShortcut(.defaultAction)
                Button("Don't share") { answer(false) }
            }
        }
        .padding(10)
        .background(RoundedRectangle(cornerRadius: 8).fill(.quaternary))
    }

    private func answer(_ share: Bool) {
        sharing = share
        asked = true
        Analytics.setSharing(share)
    }

    private var footer: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(earth.satellite.credit).font(Fonts.text(.caption)).foregroundStyle(.secondary)
            HStack {
                Button("Live Earth on the web") {
                    Analytics.track("Opened Live Earth Web")
                    NSWorkspace.shared.open(URL(string: "https://kylepace.dev/live-earth/")!)
                }
                .buttonStyle(.link)
                Spacer()
                Button("Quit") { NSApp.terminate(nil) }
                    .keyboardShortcut("q")
            }
        }
    }
}
