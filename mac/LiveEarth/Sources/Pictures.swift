import AppKit
import Foundation

// Finding and downloading the newest picture for a view. The same rules as the web lab
// (src/lib/goes.ts and src/lib/eumetsat.ts):
// - GOES: NOAA posts each scan as a JPEG at a predictable address. Scans start every
//   `cadence` minutes; a whole-Earth scan shows up 15 to 25 minutes after it starts, so the
//   app tries the newest few start times until one exists.
// - Meteosat: EUMETSAT's map service draws a flat map of a region for any size. The app only
//   asks for on-the-hour scans at least 45 minutes old, which EUMETSAT's data policy makes
//   free "Core" data (CC BY 4.0).

struct Picture {
    let image: CGImage
    let scan: Date
    /// Fractions of the picture to cut off to hide NOAA's logo and caption bar.
    let trimBottom: Double
    let trimLeft: Double
}

enum PictureError: LocalizedError {
    case notFound, unreadable

    var errorDescription: String? {
        switch self {
        case .notFound: "Couldn't find a recent picture. Live Earth will try again soon."
        case .unreadable: "The picture didn't download properly. Live Earth will try again soon."
        }
    }
}

enum Pictures {
    static let noaa = "https://cdn.star.nesdis.noaa.gov"
    static let eumetsat = "https://view.eumetsat.int/geoserver/ows"

    private static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60
        config.httpAdditionalHeaders = ["User-Agent": "LiveEarth-Mac (kylepace.dev/live-earth)"]
        return URLSession(configuration: config)
    }()

    /// The newest picture of `view`, at a size that covers `needWidth` pixels across.
    static func latest(_ sat: Satellite, _ view: EarthView, needWidth: Double, now: Date = .now) async throws -> Picture {
        sat.isNOAA
            ? try await latestGOES(sat, view, needWidth: needWidth, now: now)
            : try await latestMeteosat(sat, view, needWidth: needWidth, now: now)
    }

    // MARK: GOES

    static func latestGOES(_ sat: Satellite, _ view: EarthView, needWidth: Double, now: Date) async throws -> Picture {
        let size = pickSize(view, needWidth: needWidth)
        for when in candidates(now: now, view: view) {
            let url = goesURL(sat, view, when: when, size: size)
            var head = URLRequest(url: url)
            head.httpMethod = "HEAD"
            guard let (_, response) = try? await session.data(for: head),
                  (response as? HTTPURLResponse)?.statusCode == 200 else { continue }
            let image = try await download(url)
            return Picture(image: image, scan: when, trimBottom: size[2], trimLeft: size[3])
        }
        throw PictureError.notFound
    }

    /// The smallest size at least `needWidth` across, up to NOAA's 5424 px pictures.
    static func pickSize(_ view: EarthView, needWidth: Double) -> [Double] {
        let allowed = view.sizes.filter { $0[0] <= 5500 }
        let list = allowed.isEmpty ? [view.sizes[0]] : allowed
        return list.first { $0[0] >= needWidth } ?? list[list.count - 1]
    }

    static func candidates(now: Date, view: EarthView, count: Int = 8) -> [Date] {
        let minutes = Int((now.timeIntervalSince1970 - 4 * 60) / 60)
        let cadence = view.cadence
        let first = minutes - ((((minutes - view.offset) % cadence) + cadence) % cadence)
        return (0..<count).map { Date(timeIntervalSince1970: Double((first - $0 * cadence) * 60)) }
    }

    static func goesURL(_ sat: Satellite, _ view: EarthView, when: Date, size: [Double]) -> URL {
        let folder = (view.code == "FD" || view.code == "CONUS") ? view.code : "SECTOR/\(view.code)"
        let file = "\(stamp(when))_\(sat.code)-ABI-\(view.code)-GEOCOLOR-\(Int(size[0]))x\(Int(size[1])).jpg"
        return URL(string: "\(noaa)/\(sat.code)/ABI/\(folder)/GEOCOLOR/\(file)")!
    }

    /// Year, day of year, hour and minute in UTC, as NOAA writes them in file names.
    static func stamp(_ date: Date) -> String {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        let c = cal.dateComponents([.year, .hour, .minute], from: date)
        let day = cal.ordinality(of: .day, in: .year, for: date) ?? 1
        return String(format: "%04d%03d%02d%02d", c.year!, day, c.hour!, c.minute!)
    }

    // MARK: Meteosat

    static func latestMeteosat(_ sat: Satellite, _ view: EarthView, needWidth: Double, now: Date) async throws -> Picture {
        guard let extent = view.extent else { throw PictureError.notFound }
        // views.ts leaves Meteosat-12's layer to eumetsat.ts's default; Indian Ocean names its own.
        let layer = sat.layer ?? "mtg_fd:rgb_geocolour"
        let hour = floor((now.timeIntervalSince1970 - 45 * 60) / 3600) * 3600
        let when = Date(timeIntervalSince1970: hour)
        let width = Int(min(max(needWidth, 1200), 4000))
        // The same shape the web lab asks for (its sizes allow for the map's stretch).
        let aspect = view.sizes.first.map { $0[1] / $0[0] } ?? (extent.north - extent.south) / (extent.east - extent.west)
        let height = Int(Double(width) * aspect)
        var parts = URLComponents(string: eumetsat)!
        let time = ISO8601DateFormatter().string(from: when)
        parts.queryItems = [
            .init(name: "service", value: "WMS"), .init(name: "version", value: "1.3.0"),
            .init(name: "request", value: "GetMap"), .init(name: "layers", value: layer),
            .init(name: "styles", value: ""), .init(name: "crs", value: "EPSG:4326"),
            .init(name: "bbox", value: "\(extent.south),\(extent.west),\(extent.north),\(extent.east)"),
            .init(name: "width", value: "\(width)"), .init(name: "height", value: "\(height)"),
            .init(name: "format", value: "image/jpeg"), .init(name: "bgcolor", value: "0x000000"),
            .init(name: "time", value: time),
        ]
        let image = try await download(parts.url!)
        return Picture(image: image, scan: when, trimBottom: 0, trimLeft: 0)
    }

    // MARK: Download

    static func download(_ url: URL) async throws -> CGImage {
        let (data, response) = try await session.data(from: url)
        guard (response as? HTTPURLResponse)?.statusCode == 200,
              let source = CGImageSourceCreateWithData(data as CFData, nil),
              let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { throw PictureError.unreadable }
        return image
    }
}
