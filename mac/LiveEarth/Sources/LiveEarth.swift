import AppKit
import Combine
import SwiftUI
import ServiceManagement

/// The app's state: which view is chosen, whether it's the desktop picture, and the newest
/// picture. Updates on a timer while the desktop picture is on, after the Mac wakes, and
/// when displays change.
@MainActor
final class LiveEarth: ObservableObject {
    enum Status: Equatable { case idle, loading, failed(String) }

    @Published private(set) var satellite: Satellite
    @Published private(set) var view: EarthView
    @Published private(set) var preview: NSImage?
    @Published private(set) var scan: Date?
    @Published private(set) var status: Status = .idle
    @Published var usesDesktop: Bool {
        didSet {
            defaults.set(usesDesktop, forKey: "usesDesktop")
            Analytics.track(usesDesktop ? "Turned On Desktop Picture" : "Turned Off Desktop Picture", ids)
            schedule()
            if usesDesktop { Task { await update(trigger: "toggle") } }
        }
    }
    @Published var minutes: Int {
        didSet {
            defaults.set(minutes, forKey: "minutes")
            Analytics.track("Changed Update Interval", ["minutes": minutes])
            schedule()
        }
    }
    @Published private(set) var opensAtLogin = SMAppService.mainApp.status == .enabled

    static let intervals = [10, 20, 30, 60]
    private let defaults = UserDefaults.standard
    private var timer: Timer?
    private var observers: [Any] = []
    private var lastPicture: Picture?
    private var updating = false

    private var ids: [String: Any] { ["satellite": satellite.id, "view": view.id] }

    init() {
        let sats = Catalog.satellites
        let sat = sats.first { $0.id == UserDefaults.standard.string(forKey: "satellite") } ?? sats[0]
        satellite = sat
        view = sat.views.first { $0.id == UserDefaults.standard.string(forKey: "view") } ?? sat.views[0]
        usesDesktop = UserDefaults.standard.bool(forKey: "usesDesktop")
        let saved = UserDefaults.standard.integer(forKey: "minutes")
        minutes = Self.intervals.contains(saved) ? saved : 20

        Analytics.start()
        let center = NSWorkspace.shared.notificationCenter
        observers.append(center.addObserver(forName: NSWorkspace.didWakeNotification, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in await self?.update(trigger: "wake") }
        })
        observers.append(NotificationCenter.default.addObserver(
            forName: NSApplication.didChangeScreenParametersNotification, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.reapply() }
        })
        schedule()
        Task {
            await update(trigger: "launch")
            #if DEBUG
            snapshotIfAsked()
            #endif
        }
    }

    #if DEBUG
    /// `-snapshot <path>`: draws the menu to a PNG and quits, so it can be checked without
    /// opening the menu bar. Debug builds only.
    private func snapshotIfAsked() {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: "-snapshot"), i + 1 < args.count else { return }
        let renderer = ImageRenderer(content: MenuView(earth: self).background(Color(nsColor: .windowBackgroundColor)))
        renderer.scale = 2
        if let image = renderer.nsImage, let tiff = image.tiffRepresentation,
           let png = NSBitmapImageRep(data: tiff)?.representation(using: .png, properties: [:]) {
            try? png.write(to: URL(fileURLWithPath: args[i + 1]))
        }
        exit(0)
    }
    #endif

    // MARK: Choices

    func choose(satellite id: String) {
        guard let sat = Catalog.satellite(id), sat != satellite else { return }
        satellite = sat
        // Keep the same kind of view if the new satellite has it ("earth", "us").
        view = sat.views.first { $0.id == view.id } ?? sat.views[0]
        save()
        Analytics.track("Changed Satellite", ids)
        Task { await update(trigger: "choice") }
    }

    func choose(view id: String) {
        guard let v = satellite.views.first(where: { $0.id == id }), v != view else { return }
        view = v
        save()
        Analytics.track("Changed View", ids)
        Task { await update(trigger: "choice") }
    }

    func setOpensAtLogin(_ on: Bool) {
        do {
            if on { try SMAppService.mainApp.register() } else { try SMAppService.mainApp.unregister() }
            Analytics.track(on ? "Turned On Open at Login" : "Turned Off Open at Login")
        } catch {
            status = .failed("Couldn't change Open at Login. You can set it in System Settings › General › Login Items.")
        }
        opensAtLogin = SMAppService.mainApp.status == .enabled
    }

    private func save() {
        defaults.set(satellite.id, forKey: "satellite")
        defaults.set(view.id, forKey: "view")
    }

    // MARK: Updating

    private func schedule() {
        timer?.invalidate()
        guard usesDesktop else { return }
        timer = Timer.scheduledTimer(withTimeInterval: Double(minutes * 60), repeats: true) { [weak self] _ in
            Task { @MainActor in await self?.update(trigger: "schedule") }
        }
        timer?.tolerance = 60
    }

    /// Gets the newest picture, shows it in the menu, and sets it as the desktop picture if
    /// that's on. `trigger` says why: launch, schedule, wake, choice, toggle or button.
    func update(trigger: String) async {
        guard !updating else { return }
        updating = true
        defer { updating = false }
        let sat = satellite, v = view
        status = .loading
        do {
            let screens = NSScreen.screens
            let picture = try await Pictures.latest(sat, v, needWidth: Desktop.neededWidth(for: v, screens: screens))
            // The choice may have changed while this downloaded.
            guard sat == satellite, v == view else { return }
            lastPicture = picture
            scan = picture.scan
            if let thumb = Desktop.compose(picture, view: v, size: CGSize(width: 640, height: 400)) {
                preview = NSImage(cgImage: thumb, size: NSSize(width: 320, height: 200))
            }
            var displays = 0
            if usesDesktop { displays = try Desktop.set(picture, view: v, screens: screens) }
            status = .idle
            if trigger == "button" {
                Analytics.track("Updated Desktop Picture", ids.merging(["trigger": trigger, "displays": displays]) { a, _ in a })
            }
        } catch {
            status = .failed((error as? LocalizedError)?.errorDescription ?? "Something went wrong. Live Earth will try again soon.")
        }
    }

    /// Displays changed: redraw the last picture for the new sizes without downloading.
    private func reapply() {
        guard usesDesktop, let picture = lastPicture else { return }
        _ = try? Desktop.set(picture, view: view, screens: NSScreen.screens)
    }
}
