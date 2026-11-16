import AppKit
import UniformTypeIdentifiers

// Turning a picture into a desktop picture for each display, and setting it.
//
// - Whole Earth: the planet, round, on black, filling 86% of the display's height. The round
//   mask also hides NOAA's logo and caption, which sit in the corners.
// - Regions: the caption and logo trimmed off, then cropped to the display's shape.
//
// Each picture is saved in the app's own folder under a new name every time, because macOS
// keeps showing the old picture if the file name stays the same. Older ones are deleted.

enum Desktop {
    /// How much of NOAA's whole-Earth picture the planet fills (radius ÷ width).
    static let diskFill = 0.4994
    /// How much of the display's height the planet fills.
    static let diskHeight = 0.86

    static var folder: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let url = base.appendingPathComponent("Desktop Pictures", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    static func pixelSize(of screen: NSScreen) -> CGSize {
        CGSize(width: screen.frame.width * screen.backingScaleFactor,
               height: screen.frame.height * screen.backingScaleFactor)
    }

    /// How wide a source picture needs to be to look sharp on these displays.
    static func neededWidth(for view: EarthView, screens: [NSScreen]) -> Double {
        let sizes = screens.map(pixelSize(of:))
        if view.isDisk { return Double(sizes.map(\.height).max() ?? 1800) * diskHeight }
        return Double(sizes.map(\.width).max() ?? 2880)
    }

    static func compose(_ picture: Picture, view: EarthView, size: CGSize) -> CGImage? {
        let w = Int(size.width), h = Int(size.height)
        guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                                  space: CGColorSpace(name: CGColorSpace.sRGB)!,
                                  bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { return nil }
        ctx.interpolationQuality = .high
        ctx.setFillColor(.black)
        ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
        let image = picture.image
        let iw = Double(image.width), ih = Double(image.height)

        if view.isDisk {
            let diameter = Double(h) * diskHeight
            let scale = diameter / (2 * diskFill * iw)
            let drawn = CGRect(x: (Double(w) - iw * scale) / 2, y: (Double(h) - ih * scale) / 2,
                               width: iw * scale, height: ih * scale)
            ctx.addEllipse(in: CGRect(x: (Double(w) - diameter) / 2, y: (Double(h) - diameter) / 2,
                                      width: diameter, height: diameter))
            ctx.clip()
            ctx.draw(image, in: drawn)
        } else {
            // The part of the picture left after the caption and logo come off.
            let left = iw * picture.trimLeft
            let usable = CGRect(x: left, y: 0, width: iw - left, height: ih * (1 - picture.trimBottom))
            // The largest piece of that with the display's shape, centred.
            let target = Double(w) / Double(h)
            var crop = usable
            if usable.width / usable.height > target {
                crop.size.width = usable.height * target
                crop.origin.x = usable.midX - crop.width / 2
            } else {
                crop.size.height = usable.width / target
                crop.origin.y = usable.midY - crop.height / 2
            }
            // CGImage crops are measured from the top; `usable` already is.
            guard let piece = image.cropping(to: crop.integral) else { return nil }
            ctx.draw(piece, in: CGRect(x: 0, y: 0, width: w, height: h))
        }
        return ctx.makeImage()
    }

    /// Composes and sets the picture on each display. Returns how many displays changed.
    @MainActor
    static func set(_ picture: Picture, view: EarthView, screens: [NSScreen]) throws -> Int {
        let stamp = Int(Date().timeIntervalSince1970)
        var made: [URL] = []
        for (index, screen) in screens.enumerated() {
            guard let image = compose(picture, view: view, size: pixelSize(of: screen)) else { continue }
            let url = folder.appendingPathComponent("live-earth-\(index)-\(stamp).jpg")
            guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else { continue }
            CGImageDestinationAddImage(dest, image, [kCGImageDestinationLossyCompressionQuality: 0.9] as CFDictionary)
            guard CGImageDestinationFinalize(dest) else { continue }
            try NSWorkspace.shared.setDesktopImageURL(url, for: screen, options: [
                .imageScaling: NSImageScaling.scaleProportionallyUpOrDown.rawValue,
                .allowClipping: true,
                .fillColor: NSColor.black,
            ])
            made.append(url)
        }
        // Keep only the pictures just set.
        let keep = Set(made.map(\.lastPathComponent))
        for file in (try? FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)) ?? []
        where !keep.contains(file.lastPathComponent) {
            try? FileManager.default.removeItem(at: file)
        }
        return made.count
    }
}
