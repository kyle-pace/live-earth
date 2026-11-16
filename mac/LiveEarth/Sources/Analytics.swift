import AmplitudeSwift
import Foundation

/// Anonymous usage counts in the kylepace.dev Amplitude project (902556), shared with the web
/// lab. Every event carries `experiment: live-earth` and `app: mac`, so charts can tell the Mac
/// app from the web page. Event names match the web lab's where they mean the same thing.
///
/// Asked first: nothing is sent, and Amplitude isn't created, until the person says yes in the
/// menu. No account or user ID; IP address, city, DMA, carrier and IDFV are off.
/// `-noAnalytics` turns it off for test runs.
enum Analytics {
    private static let choiceKey = "analyticsChoice"
    /// kylepace.dev's browser key, the same one the web lab uses. Amplitude keys are public.
    private static let apiKey = "15494c5b9d8a36939245949ac59554ee"
    nonisolated(unsafe) private static var client: Amplitude?

    /// The person's answer, or nil before they've been asked.
    static var choice: Bool? {
        UserDefaults.standard.string(forKey: choiceKey).map { $0 == "share" }
    }

    @MainActor
    static func setSharing(_ on: Bool) {
        if !on, choice == true { track("Turned Off Usage Sharing"); client?.flush() }
        UserDefaults.standard.set(on ? "share" : "none", forKey: choiceKey)
        if on {
            start()
            client?.optOut = false
            track("Turned On Usage Sharing")
        } else {
            client?.optOut = true
        }
    }

    @MainActor
    static func start() {
        guard client == nil, choice == true,
              !ProcessInfo.processInfo.arguments.contains("-noAnalytics") else { return }
        let tracking = TrackingOptions()
            .disableTrackIpAddress()
            .disableTrackCity()
            .disableTrackDMA()
            .disableTrackCarrier()
            .disableTrackIDFV()
        client = Amplitude(configuration: Configuration(
            apiKey: apiKey,
            optOut: false,
            logLevel: .warn,
            trackingOptions: tracking,
            autocapture: [.sessions, .appLifecycles],
            enableAutoCaptureRemoteConfig: false
        ))
        #if DEBUG
        let build = "debug"
        #else
        let build = "release"
        #endif
        let identify = Identify().set(property: "build", value: build)
        client?.identify(identify: identify)
    }

    /// Events (all in the kylepace.dev tracking plan):
    /// - Changed Satellite, Changed View: `satellite`, `view` (same as the web lab)
    /// - Turned On Desktop Picture, Turned Off Desktop Picture: `satellite`, `view`
    /// - Changed Update Interval: `minutes`
    /// - Updated Desktop Picture: `trigger` (button or schedule), `displays`, `satellite`, `view`.
    ///   Only sent for the button, so scheduled updates don't flood the project.
    /// - Turned On Open at Login, Turned Off Open at Login
    /// - Opened Live Earth Web
    /// - Turned On Usage Sharing, Turned Off Usage Sharing
    static func track(_ event: String, _ properties: [String: Any] = [:]) {
        guard let client else { return }
        var props = properties
        props["experiment"] = "live-earth"
        props["app"] = "mac"
        client.track(eventType: event, eventProperties: props)
    }
}
