// Draws Live Earth's app icon from a real whole-Earth GOES picture (public domain, NOAA):
// the planet on a night-sky tile in macOS's rounded shape.
// From mac/: swift make-icon.swift <GOES full-disk JPEG> LiveEarth/Resources/Assets.xcassets/AppIcon.appiconset/mac-1024.png
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: CommandLine.arguments[1]) as CFURL, nil)!
let earth = CGImageSourceCreateImageAtIndex(src, 0, nil)!
let ctx = CGContext(data: nil, width: 1024, height: 1024, bitsPerComponent: 8, bytesPerRow: 0,
                    space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
let tile = CGRect(x: 100, y: 100, width: 824, height: 824)
ctx.addPath(CGPath(roundedRect: tile, cornerWidth: 185, cornerHeight: 185, transform: nil))
ctx.clip()
// Deep blue night sky, a little lighter at the top.
let sky = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB)!,
                     colors: [CGColor(srgbRed: 0.09, green: 0.13, blue: 0.27, alpha: 1),
                              CGColor(srgbRed: 0.02, green: 0.03, blue: 0.08, alpha: 1)] as CFArray,
                     locations: [0, 1])!
ctx.drawLinearGradient(sky, start: CGPoint(x: 512, y: 924), end: CGPoint(x: 512, y: 100), options: [])
// A few stars.
ctx.setFillColor(CGColor(gray: 1, alpha: 0.7))
for (x, y, r) in [(190.0, 820.0, 5.0), (300, 870, 3), (820, 840, 4), (860, 700, 3), (170, 640, 3), (760, 170, 3), (230, 200, 4)] {
    ctx.fillEllipse(in: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r))
}
// The planet: NOAA's picture is the disk at 0.4994 of its width, so draw it so the disk is 640 px.
let diameter = 640.0
let scale = diameter / (2 * 0.4994 * Double(earth.width))
let size = Double(earth.width) * scale
ctx.saveGState()
ctx.addEllipse(in: CGRect(x: 512 - diameter / 2, y: 512 - diameter / 2, width: diameter, height: diameter))
ctx.clip()
ctx.draw(earth, in: CGRect(x: 512 - size / 2, y: 512 - size / 2, width: size, height: size))
ctx.restoreGState()
// A thin atmosphere glow.
ctx.setStrokeColor(CGColor(srgbRed: 0.55, green: 0.78, blue: 1, alpha: 0.45))
ctx.setLineWidth(6)
ctx.strokeEllipse(in: CGRect(x: 512 - diameter / 2 - 3, y: 512 - diameter / 2 - 3, width: diameter + 6, height: diameter + 6))
let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: CommandLine.arguments[2]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, ctx.makeImage()!, nil)
CGImageDestinationFinalize(dest)
