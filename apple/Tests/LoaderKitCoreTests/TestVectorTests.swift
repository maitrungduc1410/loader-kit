import Foundation
import LoaderKitCore
import XCTest

final class TestVectorTests: XCTestCase {
    private struct Index: Decodable {
        let tolerance: Double
        let files: [String]
    }

    private enum Scalar: Decodable, Equatable {
        case number(Double)
        case string(String)

        init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            if let number = try? container.decode(Double.self) {
                self = .number(number)
            } else {
                self = .string(try container.decode(String.self))
            }
        }
    }

    private struct Vector: Decodable {
        struct Sample: Decodable {
            let t: Double
            let elements: [[String: Double]]
        }

        struct CycleProgress: Decodable {
            let cycleProgress: Double
            let t: Double
        }

        let id: String
        let spec: IndicatorSpec
        let params: [String: Double]
        let shapes: [[String: Scalar]]
        let samples: [Sample]
        let cycleProgress: [CycleProgress]
    }

    private static let directory = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent() // LoaderKitCoreTests
        .deletingLastPathComponent() // Tests
        .deletingLastPathComponent() // apple
        .deletingLastPathComponent()
        .appendingPathComponent("test-vectors")

    private func load<T: Decodable>(_ type: T.Type, _ file: String) throws -> T {
        let data = try Data(contentsOf: Self.directory.appendingPathComponent(file))
        return try JSONDecoder().decode(type, from: data)
    }

    /// Every field of `state`, by its JSON name.
    private func fields(of state: ElementState) throws -> [String: Double] {
        try JSONDecoder().decode([String: Double].self, from: JSONEncoder().encode(state))
    }

    private func fields(of shape: IndicatorEvaluator.Shape) -> [String: Scalar] {
        switch shape {
        case let .circle(startAngle, sweep):
            return ["type": .string("circle"), "startAngle": .number(startAngle), "sweep": .number(sweep)]
        case .rect(let cornerRadius):
            return ["type": .string("rect"), "cornerRadius": .number(cornerRadius)]
        case let .ring(strokeWidth, startAngle, sweep, segments):
            return [
                "type": .string("ring"),
                "strokeWidth": .number(strokeWidth),
                "startAngle": .number(startAngle),
                "sweep": .number(sweep),
                "segments": .number(Double(segments)),
            ]
        case .triangle:
            return ["type": .string("triangle")]
        case .line:
            return ["type": .string("line")]
        }
    }

    private func assertEqual(_ actual: Scalar?, _ expected: Scalar, accuracy: Double, _ message: String) {
        switch (actual, expected) {
        case let (.number(value)?, .number(reference)):
            XCTAssertEqual(value, reference, accuracy: accuracy, message)
        default:
            XCTAssertEqual(actual, expected, message)
        }
    }

    func testEveryVectorMatchesTheReferenceEvaluator() throws {
        let index = try load(Index.self, "index.json")
        XCTAssertEqual(index.files.count, 57)
        let tolerance = index.tolerance
        var sampleCount = 0

        for file in index.files {
            let vector = try load(Vector.self, file)
            XCTAssertEqual(vector.spec.validationErrors(), [], file)
            XCTAssertEqual(try IndicatorSpec(json: vector.spec.jsonString()), vector.spec, file)
            let evaluator = try IndicatorEvaluator(spec: vector.spec, params: vector.params)

            XCTAssertEqual(evaluator.parts.count, vector.shapes.count, file)
            for (part, (actual, expected)) in zip(evaluator.parts.map(\.shape), vector.shapes).enumerated() {
                let actualFields = fields(of: actual)
                XCTAssertEqual(Set(actualFields.keys), Set(expected.keys), "\(file) part \(part) shape")
                for (key, value) in expected {
                    assertEqual(actualFields[key], value, accuracy: tolerance, "\(file) part \(part) shape \(key)")
                }
            }

            XCTAssertFalse(vector.samples.isEmpty, file)
            for sample in vector.samples {
                let actual = evaluator.states(at: sample.t)
                XCTAssertEqual(actual, try vector.spec.evaluate(at: sample.t, params: vector.params))
                XCTAssertEqual(actual.count, sample.elements.count, "\(file) t=\(sample.t)")
                XCTAssertEqual(actual.count, evaluator.elementCount, "\(file) t=\(sample.t)")
                for (position, (state, expected)) in zip(actual, sample.elements).enumerated() {
                    let actualFields = try fields(of: state)
                    let message = "\(file) t=\(sample.t) element \(position)"
                    XCTAssertEqual(Set(actualFields.keys), Set(expected.keys), message)
                    XCTAssertEqual(Double(state.index), expected["index"], message)
                    XCTAssertEqual(Double(state.part), expected["part"], message)
                    for (key, value) in expected {
                        XCTAssertEqual(actualFields[key] ?? .nan, value, accuracy: tolerance, "\(message) \(key)")
                    }
                }
                sampleCount += 1
            }

            XCTAssertFalse(vector.cycleProgress.isEmpty, file)
            for sample in vector.cycleProgress {
                XCTAssertEqual(
                    evaluator.timeForCycleProgress(sample.cycleProgress),
                    sample.t,
                    accuracy: tolerance,
                    "\(file) cycleProgress=\(sample.cycleProgress)"
                )
                XCTAssertEqual(
                    try vector.spec.timeForCycleProgress(sample.cycleProgress, params: vector.params),
                    sample.t,
                    accuracy: tolerance
                )
            }
        }
        XCTAssertGreaterThan(sampleCount, 0)
    }

    func testBuiltinVectorsUseTheBundledSpecs() throws {
        let index = try load(Index.self, "index.json")
        var builtins = Set<String>()
        for file in index.files {
            let vector = try load(Vector.self, file)
            guard IndicatorSpec.builtinNames.contains(vector.id) else { continue }
            XCTAssertEqual(IndicatorSpec.builtin(named: vector.id), vector.spec, vector.id)
            builtins.insert(vector.id)
        }
        XCTAssertEqual(builtins, Set(IndicatorSpec.builtinNames))
    }

    func testEveryBuiltinLoads() {
        XCTAssertEqual(IndicatorSpec.builtinNames.count, 50)
        for name in IndicatorSpec.builtinNames {
            XCTAssertNotNil(IndicatorSpec.builtin(named: name), name)
        }
    }
}
