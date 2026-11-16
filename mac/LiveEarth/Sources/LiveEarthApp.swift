import AppKit
import CoreText
import SwiftUI

// Live Earth for Mac: a menu bar app that keeps a live satellite picture of Earth as the
// desktop picture. No Dock icon or window (LSUIElement); everything is in the menu.

@main
struct LiveEarthApp: App {
    @StateObject private var earth: LiveEarth

    init() {
        Fonts.register()
        _earth = StateObject(wrappedValue: LiveEarth())
    }

    var body: some Scene {
        MenuBarExtra {
            MenuView(earth: earth)
        } label: {
            Image(systemName: "globe.americas.fill")
                .accessibilityLabel("Live Earth")
        }
        .menuBarExtraStyle(.window)
    }
}

/// Atkinson Hyperlegible Next, bundled from KitchenUI's copy, as the principles ask.
enum Fonts {
    static func register() {
        for url in Bundle.main.urls(forResourcesWithExtension: "ttf", subdirectory: nil) ?? [] {
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
    }

    static func text(_ style: Font.TextStyle, weight: String = "Regular") -> Font {
        let size: CGFloat = switch style {
        case .headline: 14
        case .caption, .caption2: 11
        case .footnote: 12
        default: 13
        }
        return .custom("AtkinsonHyperlegibleNext-\(weight)", size: size, relativeTo: style)
    }
}
