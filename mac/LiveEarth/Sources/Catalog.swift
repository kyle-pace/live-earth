import Foundation

// The satellites and views the app can show. views.json is exported from the web lab's
// src/lib/views.ts by scripts/export-mac-views.py, so both use one list.

struct Extent: Codable, Hashable {
    let south: Double
    let west: Double
    let north: Double
    let east: Double
}

struct EarthView: Codable, Hashable, Identifiable {
    let id: String
    let code: String
    let label: String
    let group: String
    /// "disk" for a whole Earth (shown round, on black), "rect" for a region.
    let shape: String
    /// Minutes between scans, and the minute they start on.
    let cadence: Int
    let offset: Int
    /// [width, height, trim bottom, trim left]: the trims hide NOAA's logo and caption bar.
    let sizes: [[Double]]
    /// Meteosat regions only: the part of EUMETSAT's flat map to show.
    let extent: Extent?

    var isDisk: Bool { shape == "disk" }
}

struct Satellite: Codable, Hashable, Identifiable {
    let id: String
    let code: String
    let name: String
    let craft: String
    let source: String
    let layer: String?
    let views: [EarthView]

    var isNOAA: Bool { source == "noaa" }

    /// The credit the picture's licence asks for.
    var credit: String {
        if isNOAA { return "Pictures from NOAA's \(craft) satellite." }
        let year = Calendar(identifier: .gregorian).component(.year, from: Date())
        return "Contains modified EUMETSAT Meteosat data \(year)."
    }
}

enum Catalog {
    static let satellites: [Satellite] = {
        guard let url = Bundle.main.url(forResource: "views", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let list = try? JSONDecoder().decode([Satellite].self, from: data) else { return [] }
        return list
    }()

    static func satellite(_ id: String) -> Satellite? { satellites.first { $0.id == id } }
}
