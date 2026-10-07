import Foundation
import LoaderKitCore
import XCTest

final class ValidationTests: XCTestCase {
    private let base: [String: Any] = [
        "schemaVersion": 1,
        "name": "Test",
        "duration": 1,
        "layout": ["type": "single"],
        "shape": ["type": "circle"],
        "tracks": [["property": "opacity", "keyTimes": [0, 1], "values": [0, 1]]],
    ]

    private var baseTrack: [String: Any] {
        (base["tracks"] as! [[String: Any]])[0]
    }

    private func errors(for object: Any) throws -> [String] {
        let data = try JSONSerialization.data(withJSONObject: object, options: [.fragmentsAllowed])
        return IndicatorSpec.validate(jsonData: data)
    }

    private func errors(patch: [String: Any]) throws -> [String] {
        try errors(for: base.merging(patch) { _, new in new })
    }

    private func errors(trackPatch: [String: Any]) throws -> [String] {
        try errors(patch: ["tracks": [baseTrack.merging(trackPatch) { _, new in new }]])
    }

    func testBuiltinIndicatorsAreValid() throws {
        XCTAssertFalse(IndicatorSpec.builtinNames.isEmpty)
        for name in IndicatorSpec.builtinNames {
            let spec = try XCTUnwrap(IndicatorSpec.builtin(named: name), name)
            XCTAssertEqual(spec.validationErrors(), [], name)
            XCTAssertEqual(spec.name, name)
        }
        XCTAssertNil(IndicatorSpec.builtin(named: "Nope"))
    }

    func testBaseFixtureIsValid() throws {
        XCTAssertEqual(try errors(for: base), [])
    }

    func testRejectsBadTopLevelFields() throws {
        XCTAssertFalse(try errors(patch: ["schemaVersion": 2]).isEmpty)
        XCTAssertFalse(try errors(patch: ["duration": 0]).isEmpty)
        XCTAssertFalse(try errors(patch: ["perspective": -1]).isEmpty)
        XCTAssertFalse(try errors(for: NSNull()).isEmpty)
        XCTAssertFalse(IndicatorSpec.validate(json: "null").isEmpty)
        XCTAssertFalse(IndicatorSpec.validate(json: "{not json").isEmpty)

        let spec = try IndicatorSpec(jsonData: JSONSerialization.data(withJSONObject: base))
        var withNaN = spec
        withNaN.params = ["a": .nan]
        XCTAssertFalse(withNaN.validationErrors().isEmpty)
    }

    func testRejectsBadLayoutsShapesAndStagger() throws {
        XCTAssertFalse(try errors(patch: ["layout": ["type": "row", "gap": 0.1]]).isEmpty)
        XCTAssertFalse(try errors(patch: ["layout": ["type": "hex"]]).isEmpty)
        XCTAssertFalse(try errors(patch: ["shape": ["type": "ring"]]).isEmpty)
        XCTAssertFalse(try errors(patch: ["stagger": ["each": "fast"]]).isEmpty)
        XCTAssertFalse(try errors(patch: ["stagger": [0, "soon"]]).isEmpty)
        XCTAssertFalse(try errors(patch: ["shape": ["type": "ring", "strokeWidth": 0.1, "sweep": 7]]).isEmpty)
        XCTAssertFalse(try errors(patch: ["shape": ["type": "circle", "sweep": 0]]).isEmpty)
        XCTAssertFalse(try errors(patch: ["layout": ["type": "stack"]]).isEmpty)
        XCTAssertFalse(try errors(patch: ["layout": ["type": "single", "x": "left"]]).isEmpty)
    }

    func testNegativeStaggerOffsetsAreValid() throws {
        XCTAssertEqual(try errors(patch: ["layout": ["type": "stack", "count": 2], "stagger": [0, -0.5]]), [])
        XCTAssertEqual(
            try errors(patch: ["layout": ["type": "stack", "count": 2], "stagger": ["each": -0.1, "start": 0.2]]),
            []
        )
    }

    func testPartsRestDurationsAndGroupTracks() throws {
        let part: [String: Any] = ["layout": base["layout"]!, "shape": base["shape"]!, "tracks": base["tracks"]!]
        let head = base.filter { !["layout", "shape", "tracks"].contains($0.key) }
        func errors(parts: [Any], extra: [String: Any] = [:]) throws -> [String] {
            try self.errors(for: head.merging(["parts": parts]) { _, new in new }.merging(extra) { _, new in new })
        }
        let groupRotate: [String: Any] = ["property": "rotate", "keyTimes": [0, 1], "values": [0, 1]]

        XCTAssertEqual(try errors(parts: [part, ["layout": base["layout"]!, "shape": ["type": "rect"], "duration": 2]]), [])
        XCTAssertFalse(try errors(parts: []).isEmpty)
        XCTAssertFalse(try errors(parts: [part], extra: ["layout": base["layout"]!]).isEmpty)
        XCTAssertFalse(try errors(parts: [part.merging(["duration": 0]) { _, new in new }]).isEmpty)
        XCTAssertTrue(try errors(parts: [["layout": base["layout"]!, "shape": base["shape"]!]])
            .contains { $0.contains("at least one track") })
        XCTAssertEqual(try errors(parts: [["layout": base["layout"]!, "shape": base["shape"]!, "groupTracks": [groupRotate]]]), [])
        XCTAssertFalse(try errors(parts: [[
            "layout": base["layout"]!,
            "shape": base["shape"]!,
            "groupTracks": [groupRotate.merging(["property": "rotateX"]) { _, new in new }],
        ]]).isEmpty)
        XCTAssertFalse(try self.errors(patch: ["durations": [1, 0]]).isEmpty)
        XCTAssertEqual(try self.errors(patch: ["durations": [0.5], "rest": ["opacity": 0.5]]), [])
        XCTAssertFalse(try self.errors(patch: ["rest": ["skew": 1]]).isEmpty)
        XCTAssertFalse(try self.errors(patch: ["rest": ["opacity": ["$param": "missing"]]]).isEmpty)
    }

    func testStrokeTrimsNeedARingShape() throws {
        let trim: [String: Any] = ["property": "strokeEnd", "keyTimes": [0, 1], "values": [0, 1]]
        XCTAssertTrue(try errors(patch: ["tracks": [trim]]).contains { $0.contains("needs a ring shape") })
        XCTAssertFalse(try errors(patch: ["rest": ["strokeStart": 0.2]]).isEmpty)
        XCTAssertEqual(
            try errors(patch: [
                "shape": ["type": "ring", "strokeWidth": 0.1],
                "tracks": [trim],
                "rest": ["strokeStart": 0.2],
            ]),
            []
        )
    }

    func testPartProblemsArePrefixedWithTheirPath() throws {
        let head = base.filter { !["layout", "shape", "tracks"].contains($0.key) }
        let spec = head.merging(["parts": [
            ["layout": ["type": "single"], "shape": ["type": "circle"], "tracks": base["tracks"]!],
            [
                "layout": ["type": "hex"],
                "shape": ["type": "circle", "sweep": 7],
                "stagger": ["each": 0.1, "start": "later"],
                "duration": -1,
                "durations": "fast",
                "rest": ["strokeEnd": 0.5],
                "tracks": [["property": "strokeStart", "keyTimes": [0, 1], "values": [0, 1]]],
                "groupTracks": [["property": "rotateY", "keyTimes": [0, 1], "values": [0, 1]]],
            ],
            "nope",
        ]]) { _, new in new }
        XCTAssertEqual(try errors(for: spec), [
            "parts[1].layout.type must be one of single, stack, row, grid, ring",
            "parts[1].shape.sweep must be within (0, 2π]",
            "parts[1].stagger.start must be a finite number",
            "parts[1].duration must be a positive number",
            "parts[1].durations must be an array",
            "parts[1].rest.strokeEnd needs a ring shape",
            "parts[1].tracks[0].property \"strokeStart\" needs a ring shape",
            "parts[1].groupTracks[0].property must be one of scale, scaleX, scaleY, opacity, rotate, translateX, translateY",
            "parts[2] must be an object",
        ])
        XCTAssertEqual(try errors(for: head.merging(["parts": "all", "rest": [:]]) { _, new in new }), [
            "rest must be set inside parts when the spec has parts",
            "parts must be a non-empty array",
        ])
    }

    func testRejectsBadTracks() throws {
        XCTAssertFalse(try errors(trackPatch: ["property": "skew"]).isEmpty)
        XCTAssertFalse(try errors(trackPatch: ["keyTimes": [0], "values": [0]]).isEmpty)
        XCTAssertFalse(try errors(trackPatch: ["keyTimes": [0.5, 0.2]]).isEmpty)
        XCTAssertFalse(try errors(trackPatch: ["keyTimes": [0, 1.5]]).isEmpty)
        XCTAssertFalse(try errors(trackPatch: ["values": [0, 1, 2]]).isEmpty)
        XCTAssertFalse(try errors(trackPatch: ["easing": "bounce"]).isEmpty)
        XCTAssertFalse(try errors(trackPatch: ["easing": [1.5, 0, 0, 1]]).isEmpty)
        XCTAssertFalse(try errors(trackPatch: ["easing": ["linear", "easeIn"]]).isEmpty)
        XCTAssertFalse(try errors(patch: ["tracks": [baseTrack, baseTrack]]).isEmpty)
        XCTAssertFalse(try errors(patch: ["tracks": []]).isEmpty)
        XCTAssertEqual(try errors(trackPatch: ["easing": "ease"]), [])
    }

    func testNamesInheritedFromObjectPrototypeAreNotEasingsOrParams() throws {
        XCTAssertFalse(try errors(trackPatch: ["easing": "constructor"]).isEmpty)
        XCTAssertFalse(try errors(patch: ["layout": ["type": "single", "size": ["$param": "toString"]]]).isEmpty)
        let spec = try IndicatorSpec(jsonData: JSONSerialization.data(withJSONObject: base.merging(["params": ["a": 1]]) { _, new in new }))
        XCTAssertEqual(spec.resolvedParams(["toString": 2]), ["a": 1])
    }

    func testReportsReadableMessages() throws {
        XCTAssertEqual(try errors(patch: ["duration": 0]), ["duration must be a positive number"])
        XCTAssertEqual(
            try errors(trackPatch: ["values": [0, ["$param": "missing"]]]),
            ["tracks[0].values[1] uses unknown param \"missing\""]
        )
        XCTAssertEqual(
            try errors(patch: ["layout": ["type": "ring", "count": 3, "itemSize": 0.2, "orient": "yes"]]),
            ["layout.orient must be a boolean"]
        )
    }

    func testIgnoresUnknownFields() throws {
        XCTAssertEqual(try errors(patch: ["futureField": ["anything": true]]), [])
    }

    func testThrowsWithEveryProblemListed() {
        let spec = IndicatorSpec(
            name: "Custom",
            duration: -1,
            layout: .row(count: .param("count"), gap: 0.1),
            shape: .circle(),
            tracks: []
        )
        XCTAssertThrowsError(try spec.validate()) { error in
            let specError = error as? IndicatorSpecError
            XCTAssertNotNil(specError)
            XCTAssertGreaterThanOrEqual(specError?.problems.count ?? 0, 2)
        }
    }

    func testCatchesAStaggerArrayThatIsTooShort() {
        let spec = IndicatorSpec(
            name: "Custom",
            duration: 1,
            layout: .row(count: 3, gap: 0.1),
            shape: .circle(),
            stagger: .offsets([0, 0.1]),
            tracks: [.init(property: .opacity, keyTimes: [0, 1], values: [0, 1])]
        )
        XCTAssertThrowsError(try spec.validate()) { error in
            XCTAssertTrue(error is IndicatorSpecError)
        }
        XCTAssertFalse(IndicatorSpec.validate(json: """
        {"schemaVersion":1,"name":"T","duration":1,"layout":{"type":"row","count":3,"gap":0.1},
         "shape":{"type":"circle"},"stagger":[0,0.1],
         "tracks":[{"property":"opacity","keyTimes":[0,1],"values":[0,1]}]}
        """).isEmpty)
    }

    func testDecodingRejectsInvalidSpecs() {
        XCTAssertThrowsError(try IndicatorSpec(json: #"{"schemaVersion":2}"#)) { error in
            XCTAssertGreaterThan((error as? IndicatorSpecError)?.problems.count ?? 0, 1)
        }
        XCTAssertThrowsError(try JSONDecoder().decode(IndicatorSpec.self, from: Data(#"{"name":"x"}"#.utf8))) { error in
            XCTAssertTrue(error is IndicatorSpecError)
        }
    }

    func testEncodingRoundTrips() throws {
        for name in IndicatorSpec.builtinNames {
            let spec = try XCTUnwrap(IndicatorSpec.builtin(named: name))
            XCTAssertEqual(try IndicatorSpec(json: spec.jsonString()), spec)
        }
        let custom = IndicatorSpec(
            name: "Custom",
            duration: 1.2,
            params: ["count": 5],
            layout: .ring(count: .param("count"), itemSize: 0.2, startAngle: -1.5, orient: true),
            shape: .rect(cornerRadius: 0.25),
            stagger: .each(0.1, start: 0.05),
            perspective: 3,
            tracks: [
                .init(property: .opacity, keyTimes: [0, 0.5, 1], values: [1, 0.2, 1], easing: .perSegment([.easeIn, .easeOut])),
                .init(property: .rotate, keyTimes: [0, 1], values: [0, 6.28], easing: .uniform(.cubicBezier(x1: 0.1, y1: 0.7, x2: 0.3, y2: 1))),
            ]
        )
        XCTAssertEqual(custom.validationErrors(), [])
        XCTAssertEqual(try IndicatorSpec(json: custom.jsonString()), custom)

        let withParts = IndicatorSpec(
            name: "Parts",
            duration: 1,
            params: ["sweep": 3],
            parts: [
                .init(
                    layout: .stack(count: 2, size: 0.5, x: 0.4),
                    shape: .ring(strokeWidth: 0.1, startAngle: 0, sweep: .param("sweep"), segments: 2),
                    tracks: [.init(property: .strokeEnd, keyTimes: [0, 1], values: [0, 1], easing: .uniform(.ease))],
                    stagger: .offsets([0, -0.5]),
                    duration: 2,
                    durations: [1, 1.5],
                    rest: [.strokeStart: 0.1, .opacity: 0.5],
                    groupTracks: [.init(property: .rotate, keyTimes: [0, 1], values: [0, 3.14])]
                ),
                .init(
                    layout: .row(count: 3, gap: 0.1, itemWidth: 0.2, itemHeight: 0.1),
                    shape: .circle(sweep: 3),
                    groupTracks: [.init(property: .translateY, keyTimes: [0, 1], values: [0, 0.1])]
                ),
            ]
        )
        XCTAssertEqual(withParts.validationErrors(), [])
        XCTAssertEqual(try IndicatorSpec(json: withParts.jsonString()), withParts)
    }

    func testInlinePartDurationIsNotWritten() throws {
        var spec = try XCTUnwrap(IndicatorSpec.builtin(named: "BallPulse"))
        guard case .inline(var part) = spec.body else { return XCTFail("BallPulse is inline") }
        part.duration = 5
        spec.body = .inline(part)
        XCTAssertEqual(try IndicatorSpec(json: spec.jsonString()).parts[0].duration, nil)
        XCTAssertEqual(try IndicatorEvaluator(spec: spec).parts[0].duration, spec.duration)
    }

    func testBadParamOverridesDoNotCrash() throws {
        let spec = try XCTUnwrap(IndicatorSpec.builtin(named: "BallPulse"))
        XCTAssertThrowsError(try IndicatorEvaluator(spec: spec, params: ["count": .nan]))
        XCTAssertThrowsError(try IndicatorEvaluator(spec: spec, params: ["count": .infinity]))
        XCTAssertThrowsError(try IndicatorEvaluator(spec: spec, params: ["count": 1e12]))
        XCTAssertEqual(try IndicatorEvaluator(spec: spec, params: ["count": -5]).elementCount, 1)
        XCTAssertEqual(try IndicatorEvaluator(spec: spec, params: ["count": 2.5]).elementCount, 3)
        XCTAssertEqual(try IndicatorEvaluator(spec: spec, params: ["unknown": 1]).params, spec.params)
    }

    func testUnvalidatedTypedSpecsDoNotCrash() {
        let spec = IndicatorSpec(
            name: "Broken",
            duration: 1,
            layout: .single(),
            shape: .circle(),
            tracks: [.init(property: .opacity, keyTimes: [0], values: [])]
        )
        XCTAssertThrowsError(try IndicatorEvaluator(spec: spec))
        XCTAssertFalse(spec.validationErrors().isEmpty)
    }
}
