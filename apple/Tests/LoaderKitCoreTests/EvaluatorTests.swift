import Foundation
import LoaderKitCore
import XCTest

final class EvaluatorTests: XCTestCase {
    private let accuracy = 1e-9

    private func geometry(_ layout: IndicatorSpec.Layout) throws -> [IndicatorEvaluator.Geometry] {
        let spec = IndicatorSpec(
            name: "Layout",
            duration: 1,
            layout: layout,
            shape: .circle(),
            tracks: [.init(property: .opacity, keyTimes: [0, 1], values: [1, 1])]
        )
        return try IndicatorEvaluator(spec: spec).parts[0].elements
    }

    func testSingleAndStackLayoutsPlaceElementsBySizeAndCenter() throws {
        XCTAssertEqual(
            try geometry(.single(size: 0.4, height: 0.2, x: 0.25)),
            [.init(cx: 0.25, cy: 0.5, width: 0.4, height: 0.2, rotate: 0)]
        )
        let stack = try geometry(.stack(count: 3, y: 0.1))
        XCTAssertEqual(stack, Array(repeating: .init(cx: 0.5, cy: 0.1, width: 1, height: 1, rotate: 0), count: 3))
    }

    func testARowWithItemWidthIsCentered() throws {
        let row = try geometry(.row(count: 2, gap: 0.2, itemWidth: 0.1))
        XCTAssertEqual(row[0].cx, 0.35, accuracy: accuracy)
        XCTAssertEqual(row[1].cx, 0.65, accuracy: accuracy)
        XCTAssertEqual(row[0].height, 0.1, accuracy: accuracy)
    }

    func testRingItemWidthAndHeightKeepTheRadiusOfItemSize() throws {
        let first = try geometry(.ring(count: 4, itemSize: 0.3, itemWidth: 0.1, itemHeight: 0.2))[0]
        XCTAssertEqual(first.cx, 0.85, accuracy: accuracy)
        XCTAssertEqual(first.width, 0.1, accuracy: accuracy)
        XCTAssertEqual(first.height, 0.2, accuracy: accuracy)
    }

    func testRestValuesApplyBeforeTheStartAndToPropertiesWithoutATrack() throws {
        let spec = IndicatorSpec(
            name: "Rest",
            duration: 1,
            layout: .stack(count: 2),
            shape: .circle(),
            stagger: .offsets([0, 0.5]),
            rest: [.opacity: 0.25, .translateX: 0.1],
            tracks: [.init(property: .opacity, keyTimes: [0, 1], values: [1, 0])]
        )
        let states = try spec.evaluate(at: 0.25)
        XCTAssertEqual(states[0].opacity, 0.75, accuracy: accuracy)
        XCTAssertEqual(states[0].translateX, 0.1, accuracy: accuracy)
        XCTAssertEqual(states[1].opacity, 0.25, accuracy: accuracy)
    }

    func testNegativeOffsetsAndPerElementDurations() throws {
        let spec = IndicatorSpec(
            name: "Offsets",
            duration: 1,
            layout: .stack(count: 2),
            shape: .circle(),
            stagger: .offsets([0, -0.25]),
            durations: [1, 2],
            tracks: [.init(property: .translateX, keyTimes: [0, 1], values: [0, 1])]
        )
        let states = try spec.evaluate(at: 0.5)
        XCTAssertEqual(states[0].translateX, 0.5, accuracy: accuracy)
        XCTAssertEqual(states[1].translateX, 0.375, accuracy: accuracy)
    }

    func testGroupTracksRunOnThePartDurationAndPartsNumberElementsGlobally() throws {
        let spec = IndicatorSpec(
            name: "Parts",
            duration: 1,
            parts: [
                .init(
                    layout: .single(),
                    shape: .circle(),
                    tracks: [.init(property: .scale, keyTimes: [0, 1], values: [0, 1])]
                ),
                .init(
                    layout: .row(count: 2, gap: 0.5),
                    shape: .ring(strokeWidth: 0.1),
                    duration: 2,
                    rest: [.opacity: 0.5],
                    groupTracks: [
                        .init(property: .rotate, keyTimes: [0, 1], values: [0, .number(Double.pi)]),
                        .init(property: .opacity, keyTimes: [0, 1], values: [1, 0]),
                    ]
                ),
            ]
        )
        XCTAssertEqual(spec.validationErrors(), [])
        let states = try spec.evaluate(at: 0.5)
        XCTAssertEqual(states.map { [$0.index, $0.part] }, [[0, 0], [1, 1], [2, 1]])
        XCTAssertEqual(states[0].groupRotate, 0, accuracy: accuracy)
        XCTAssertEqual(states[1].groupRotate, Double.pi / 4, accuracy: accuracy)
        XCTAssertEqual(states[2].opacity, 0.5 * 0.75, accuracy: accuracy)
        XCTAssertEqual(states[1].strokeEnd, 1)
    }

    func testTimeForCycleProgressSkipsTheStaggerWarmUp() throws {
        let spec = try XCTUnwrap(IndicatorSpec.builtin(named: "BallSpinFadeLoader"))
        XCTAssertEqual(try spec.timeForCycleProgress(0), 1, accuracy: accuracy)
        XCTAssertEqual(try spec.timeForCycleProgress(0.5), 1.5, accuracy: accuracy)
        XCTAssertEqual(try spec.timeForCycleProgress(2), 2, accuracy: accuracy)
    }

    func testCycleProgressWaitsForTheLatestStartAcrossParts() throws {
        let scale = IndicatorSpec.Track(property: .scale, keyTimes: [0, 1], values: [0, 1])
        let spec = IndicatorSpec(
            name: "Parts",
            duration: 1,
            parts: [
                .init(layout: .single(), shape: .circle(), tracks: [scale]),
                .init(layout: .stack(count: 2), shape: .circle(), tracks: [scale], stagger: .offsets([0, 1.5])),
            ]
        )
        XCTAssertEqual(try spec.timeForCycleProgress(0.5), 2.5, accuracy: accuracy)
    }

    func testShapesResolveTheirDefaults() throws {
        let spec = IndicatorSpec(
            name: "Shapes",
            duration: 1,
            parts: [
                .init(layout: .single(), shape: .circle(), groupTracks: [.init(property: .rotate, keyTimes: [0, 1], values: [0, 1])]),
                .init(layout: .single(), shape: .ring(strokeWidth: 0.1, segments: 2.5)),
                .init(layout: .single(), shape: .rect()),
            ]
        )
        XCTAssertEqual(try IndicatorEvaluator(spec: spec).parts.map(\.shape), [
            .circle(startAngle: -Double.pi / 2, sweep: 2 * Double.pi),
            .ring(strokeWidth: 0.1, startAngle: -Double.pi / 2, sweep: 2 * Double.pi, segments: 3),
            .rect(cornerRadius: 0),
        ])
    }

    private func problems(_ spec: IndicatorSpec) -> [String] {
        do {
            _ = try IndicatorEvaluator(spec: spec)
            return []
        } catch {
            return (error as? IndicatorSpecError)?.problems ?? ["\(error)"]
        }
    }

    private func stacks(_ counts: [Int], shape: IndicatorSpec.Shape = .circle()) -> IndicatorSpec {
        IndicatorSpec(
            name: "Stacks",
            duration: 1,
            parts: counts.map { count in
                .init(
                    layout: .stack(count: .number(Double(count))),
                    shape: shape,
                    tracks: [.init(property: .rotate, keyTimes: [0, 1], values: [0, 1])]
                )
            }
        )
    }

    func testTheElementLimitCountsEveryPart() {
        XCTAssertEqual(problems(stacks([6000, 4000])), [])
        XCTAssertEqual(problems(stacks([6000, 4001])), ["the spec has 10001 elements, the maximum is 10000"])
        XCTAssertFalse(stacks([6000, 4001]).validationErrors().isEmpty)
    }

    func testTheArcLimitCountsSegmentsOfEveryRingPart() {
        let ring = IndicatorSpec.Shape.ring(strokeWidth: 0.1, segments: 100)
        XCTAssertEqual(problems(stacks([100], shape: ring)), [])
        var spec = stacks([100], shape: ring)
        guard case .parts(var parts) = spec.body else { return XCTFail("stacks has parts") }
        parts.append(.init(layout: .single(), shape: .ring(strokeWidth: 0.1), tracks: parts[0].tracks))
        parts.append(.init(layout: .stack(count: 50), shape: .circle(), tracks: parts[0].tracks))
        spec.body = .parts(parts)
        XCTAssertEqual(problems(spec), ["the spec draws 10001 ring arcs, the maximum is 10000"])
        XCTAssertEqual(problems(stacks([200], shape: ring)), ["the spec draws 20000 ring arcs, the maximum is 10000"])
    }

    func testAGridOverTheElementLimitIsRejected() {
        let spec = IndicatorSpec(
            name: "Grid",
            duration: 1,
            layout: .grid(columns: 200, rows: 51, gap: 0),
            shape: .circle(),
            tracks: [.init(property: .rotate, keyTimes: [0, 1], values: [0, 1])]
        )
        XCTAssertEqual(problems(spec), ["the spec has 10200 elements, the maximum is 10000"])
    }

    func testStacksDuplicateTheElement() throws {
        let spec = try XCTUnwrap(IndicatorSpec.builtin(named: "BallDoubleBounce"))
        let evaluator = try IndicatorEvaluator(spec: spec)
        XCTAssertGreaterThan(evaluator.elementCount, 1)
        XCTAssertEqual(Set(evaluator.parts[0].elements).count, 1)
    }
}
