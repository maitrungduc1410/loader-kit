import Foundation
import LoaderKitCore
import XCTest

final class ProgressVectorTests: XCTestCase {
    private static let directory = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent() // LoaderKitCoreTests
        .deletingLastPathComponent() // Tests
        .deletingLastPathComponent() // apple
        .deletingLastPathComponent()
        .appendingPathComponent("test-vectors/progress")

    private func load(_ file: String) throws -> [String: Any] {
        let data = try Data(contentsOf: Self.directory.appendingPathComponent(file))
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    private lazy var tolerance: Double = (try? load("index.json")["tolerance"] as? Double) ?? 1e-6

    // MARK: conversion to JSON values

    private func json(_ paint: ProgressPaint) -> [String: Any] {
        func stops(_ stops: [ProgressColorStop]) -> [Any] {
            stops.map { ["offset": $0.offset, "color": $0.color.rawValue, "alpha": $0.alpha] }
        }
        switch paint {
        case let .solid(color, alpha):
            return ["type": "solid", "color": color.rawValue, "alpha": alpha]
        case let .linear(x0, y0, x1, y1, s):
            return ["type": "linear", "x0": x0, "y0": y0, "x1": x1, "y1": y1, "stops": stops(s)]
        case let .radial(cx, cy, r, s):
            return ["type": "radial", "cx": cx, "cy": cy, "r": r, "stops": stops(s)]
        case let .conic(cx, cy, start, s):
            return ["type": "conic", "cx": cx, "cy": cy, "start": start, "stops": stops(s)]
        }
    }

    private func json(_ shape: ProgressClipShape) -> [String: Any] {
        switch shape {
        case let .rect(x, y, width, height, radius):
            return ["type": "rect", "x": x, "y": y, "width": width, "height": height, "radius": radius]
        case let .circle(cx, cy, r):
            return ["type": "circle", "cx": cx, "cy": cy, "r": r]
        case let .polygon(points):
            return ["type": "polygon", "points": points]
        }
    }

    private func json(_ command: ProgressCommand) -> [String: Any] {
        switch command {
        case let .line(x0, y0, x1, y1, lineWidth, cap, paint):
            return ["op": "line", "x0": x0, "y0": y0, "x1": x1, "y1": y1, "lineWidth": lineWidth, "cap": cap.rawValue, "paint": json(paint)]
        case let .arc(cx, cy, r, start, end, lineWidth, cap, paint):
            return ["op": "arc", "cx": cx, "cy": cy, "r": r, "start": start, "end": end, "lineWidth": lineWidth, "cap": cap.rawValue, "paint": json(paint)]
        case let .polyline(points, closed, lineWidth, cap, paint):
            return ["op": "polyline", "points": points, "closed": closed, "lineWidth": lineWidth, "cap": cap.rawValue, "paint": json(paint)]
        case let .circle(cx, cy, r, paint):
            return ["op": "circle", "cx": cx, "cy": cy, "r": r, "paint": json(paint)]
        case let .rect(x, y, width, height, radius, paint):
            return ["op": "rect", "x": x, "y": y, "width": width, "height": height, "radius": radius, "paint": json(paint)]
        case let .strokeRect(x, y, width, height, radius, lineWidth, paint):
            return ["op": "strokeRect", "x": x, "y": y, "width": width, "height": height, "radius": radius, "lineWidth": lineWidth, "paint": json(paint)]
        case let .polygon(points, paint):
            return ["op": "polygon", "points": points, "paint": json(paint)]
        case let .sector(cx, cy, r, start, end, paint):
            return ["op": "sector", "cx": cx, "cy": cy, "r": r, "start": start, "end": end, "paint": json(paint)]
        case let .text(x, y, size, text, alignRight, paint):
            return ["op": "text", "x": x, "y": y, "size": size, "text": text, "align": alignRight ? "right" : "center", "paint": json(paint)]
        case let .clip(shape, commands):
            return ["op": "clip", "shape": json(shape), "commands": commands.map(json)]
        }
    }

    private func json(_ p: ResolvedProgress) -> [String: Any] {
        [
            "type": p.type.rawValue, "variant": p.variant.rawValue, "thickness": p.thickness, "trackGap": p.trackGap,
            "segments": Double(p.segments), "showLabel": p.showLabel, "stopIndicator": p.stopIndicator,
            "strokeCap": p.strokeCap.rawValue, "amplitude": p.amplitude, "wavelength": p.wavelength,
            "waveSpeed": p.waveSpeed, "sweepAngle": p.sweepAngle, "cornerRadius": p.cornerRadius, "speed": p.speed,
        ]
    }

    private func json(_ animator: ProgressAnimator) -> [String: Any] {
        let s = animator.state
        return [
            "indeterminate": s.indeterminate, "value": s.value, "buffer": s.buffer, "wave": s.wave, "time": s.time,
            "indeterminateTime": s.indeterminateTime, "target": animator.target.map { $0 as Any } ?? NSNull(), "moving": animator.moving,
        ]
    }

    private func options(_ json: [String: Any]) -> ProgressOptions {
        ProgressOptions(
            type: (json["type"] as? String).flatMap(ProgressType.init(rawValue:)),
            variant: (json["variant"] as? String).flatMap(ProgressVariant.init(rawValue:)),
            thickness: json["thickness"] as? Double,
            trackGap: json["trackGap"] as? Double,
            segments: json["segments"] as? Double,
            showLabel: json["showLabel"] as? Bool,
            stopIndicator: json["stopIndicator"] as? Bool,
            strokeCap: (json["strokeCap"] as? String).flatMap(ProgressStrokeCap.init(rawValue:)),
            amplitude: json["amplitude"] as? Double,
            wavelength: json["wavelength"] as? Double,
            waveSpeed: json["waveSpeed"] as? Double,
            sweepAngle: json["sweepAngle"] as? Double,
            cornerRadius: json["cornerRadius"] as? Double,
            speed: json["speed"] as? Double
        )
    }

    private func state(_ json: [String: Any]) -> ProgressState {
        ProgressState(
            indeterminate: json["indeterminate"] as! Bool,
            value: json["value"] as! Double,
            buffer: json["buffer"] as! Double,
            wave: json["wave"] as! Double,
            time: json["time"] as! Double,
            indeterminateTime: json["indeterminateTime"] as! Double
        )
    }

    /// Compares by the type of `actual`, since JSON numbers and booleans decode to the same class.
    private func assertClose(_ actual: Any, _ expected: Any?, _ path: String) {
        switch actual {
        case let value as Bool:
            XCTAssertEqual(expected as? Bool, value, path)
        case let value as Double:
            guard let number = expected as? Double else { return XCTFail("\(path): expected \(String(describing: expected)), got \(value)") }
            XCTAssertLessThanOrEqual(abs(value - number), tolerance, "\(path): \(value) != \(number)")
        case let value as String:
            XCTAssertEqual(expected as? String, value, path)
        case let values as [Double]:
            guard let list = expected as? [Any] else { return XCTFail("\(path): not an array") }
            guard list.count == values.count else { return XCTFail("\(path): length \(values.count) != \(list.count)") }
            for (i, value) in values.enumerated() {
                guard let number = list[i] as? Double else { return XCTFail("\(path)[\(i)]: not a number") }
                if abs(value - number) > tolerance { return XCTFail("\(path)[\(i)]: \(value) != \(number)") }
            }
        case let values as [Any]:
            guard let list = expected as? [Any] else { return XCTFail("\(path): not an array") }
            guard list.count == values.count else { return XCTFail("\(path): length \(values.count) != \(list.count)") }
            for (i, value) in values.enumerated() { assertClose(value, list[i], "\(path)[\(i)]") }
        case let value as [String: Any]:
            guard let object = expected as? [String: Any] else { return XCTFail("\(path): not an object") }
            XCTAssertEqual(Set(value.keys), Set(object.keys), "\(path): keys")
            for (key, item) in value { assertClose(item, object[key], "\(path).\(key)") }
        case is NSNull:
            XCTAssertTrue(expected is NSNull, "\(path): expected \(String(describing: expected)), got null")
        default:
            XCTFail("\(path): unexpected \(actual)")
        }
    }

    // MARK: tests

    func testIndexListsEveryFile() throws {
        let files = try XCTUnwrap(load("index.json")["files"] as? [String])
        let onDisk = try FileManager.default.contentsOfDirectory(atPath: Self.directory.path).filter { $0.hasSuffix(".json") && $0 != "index.json" }
        XCTAssertEqual(Set(files), Set(onDisk))
        XCTAssertEqual(files.count, 11)
    }

    func testResolveVectors() throws {
        let cases = try XCTUnwrap(load("resolve.json")["cases"] as? [[String: Any]])
        for c in cases {
            let name = c["description"] as! String
            let resolved = ResolvedProgress(options(c["options"] as! [String: Any]))
            assertClose(json(resolved), c["resolved"], name)
            let size = resolved.intrinsicSize
            assertClose(["width": size.width.map { $0 as Any } ?? NSNull(), "height": size.height.map { $0 as Any } ?? NSNull()] as [String: Any], c["intrinsicSize"], "\(name) size")
            assertClose(resolved.contentInset, c["contentInset"], "\(name) inset")
        }
    }

    func testGeometryVectors() throws {
        let files = try XCTUnwrap(load("index.json")["files"] as? [String]).filter { $0.hasPrefix("geometry-") }
        XCTAssertEqual(files.count, 9)
        for file in files {
            let cases = try XCTUnwrap(load(file)["cases"] as? [[String: Any]])
            for c in cases {
                let drawing = ProgressGeometry.commands(
                    ResolvedProgress(options(c["options"] as! [String: Any])),
                    state(c["state"] as! [String: Any]),
                    width: c["width"] as! Double,
                    height: c["height"] as! Double
                )
                let actual: [String: Any] = ["x": drawing.x, "y": drawing.y, "commands": drawing.commands.map(json)]
                let expected: [String: Any] = ["x": c["x"]!, "y": c["y"]!, "commands": c["commands"]!]
                assertClose(actual, expected, "\(file) \(c["description"] as! String)")
            }
        }
    }

    func testAnimatorVectors() throws {
        let scenarios = try XCTUnwrap(load("animator.json")["scenarios"] as? [[String: Any]])
        func number(_ value: Any?) -> Double? {
            if let text = value as? String, text == "NaN" { return .nan }
            return value as? Double
        }
        for scenario in scenarios {
            let name = scenario["description"] as! String
            let initial = scenario["initial"] as! [String: Any]
            let animator = ProgressAnimator(value: number(initial["value"]), buffer: number(initial["buffer"]))
            assertClose(json(animator), scenario["initialState"], "\(name) initial")
            var speed = scenario["speed"] as! Double
            var reduceMotion = scenario["reduceMotion"] as! Bool
            let events = scenario["events"] as! [[String: Any]]
            let snapshots = scenario["snapshots"] as! [[String: Any]]
            let frames = scenario["frames"] as! Int
            let every = scenario["every"] as! Int
            let fps = (scenario["fps"] as! NSNumber).doubleValue
            var next = 0
            for frame in 0..<frames {
                for event in events where event["frame"] as! Int == frame {
                    let now = Double(frame) / fps
                    switch event["set"] as! String {
                    case "value": animator.setValue(number(event["value"]), now: now, smooth: event["smooth"] as! Bool)
                    case "buffer": animator.setBuffer(number(event["value"]), now: now, smooth: event["smooth"] as! Bool)
                    case "speed": speed = event["value"] as! Double
                    default: reduceMotion = event["value"] as! Bool
                    }
                }
                animator.step(1.0 / fps, speed: speed, reduceMotion: reduceMotion)
                guard frame % every == 0 else { continue }
                var expected = snapshots[next]
                next += 1
                XCTAssertEqual(expected.removeValue(forKey: "frame") as? Int, frame)
                assertClose(json(animator), expected, "\(name) frame \(frame)")
            }
            XCTAssertEqual(next, snapshots.count, name)
        }
    }

    func testLabelRoundsHalfUp() {
        XCTAssertEqual(ProgressGeometry.label(0.125), "13%")
        XCTAssertEqual(ProgressGeometry.label(0.005), "1%")
        XCTAssertEqual(ProgressGeometry.label(2), "100%")
        XCTAssertEqual(ProgressGeometry.label(-1), "0%")
    }

    func testNonFiniteInput() {
        XCTAssertTrue(ProgressAnimator(value: .nan).indeterminate)
        XCTAssertEqual(ProgressAnimator(value: .infinity).target, 1)
        let resolved = ResolvedProgress(ProgressOptions(type: .linear, thickness: .nan, segments: .infinity, speed: .nan))
        XCTAssertEqual(resolved.thickness, 4)
        XCTAssertEqual(resolved.segments, 1)
        XCTAssertEqual(resolved.speed, 1)
        XCTAssertTrue(ProgressGeometry.commands(resolved, ProgressAnimator(value: 0.5).state, width: .nan, height: 10).commands.isEmpty)
    }
}
