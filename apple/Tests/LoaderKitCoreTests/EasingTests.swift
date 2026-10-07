import LoaderKitCore
import XCTest

final class EasingTests: XCTestCase {
    private let named: [IndicatorSpec.Easing] = [.linear, .easeIn, .easeOut, .easeInOut]

    func testEndpointsAreExact() {
        for easing in named {
            XCTAssertEqual(easing.ease(0), 0)
            XCTAssertEqual(easing.ease(1), 1)
            XCTAssertEqual(easing.ease(-0.5), 0)
            XCTAssertEqual(easing.ease(1.5), 1)
        }
    }

    func testLinearIsTheIdentity() {
        for x in [0.1, 0.25, 0.5, 0.9] {
            XCTAssertEqual(IndicatorSpec.Easing.linear.ease(x), x)
        }
    }

    func testEaseInOutIsSymmetric() {
        for x in [0.1, 0.3, 0.45] {
            let a = IndicatorSpec.Easing.easeInOut.ease(x)
            let b = IndicatorSpec.Easing.easeInOut.ease(1 - x)
            XCTAssertEqual(a + b, 1, accuracy: 1e-9)
        }
    }

    func testSolvesXBeforeSamplingY() {
        let (x1, y1, x2, y2) = (0.2, 0.68, 0.18, 1.08)
        let easing = IndicatorSpec.Easing.cubicBezier(x1: x1, y1: y1, x2: x2, y2: y2)
        for x in [0.05, 0.2, 0.5, 0.8, 0.95] {
            var lo = 0.0
            var hi = 1.0
            for _ in 0..<200 {
                let t = (lo + hi) / 2
                let xt = 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t
                if xt < x { lo = t } else { hi = t }
            }
            let t = (lo + hi) / 2
            let expected = 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t
            XCTAssertEqual(easing.ease(x), expected, accuracy: 1e-7, "x=\(x)")
        }
    }

    func testOvershootingCurvesLeaveTheUnitRange() {
        XCTAssertGreaterThan(IndicatorSpec.Easing.cubicBezier(x1: 0.2, y1: 0.68, x2: 0.18, y2: 1.08).ease(0.8), 1)
        XCTAssertLessThan(IndicatorSpec.Easing.cubicBezier(x1: 0.68, y1: -0.55, x2: 0.27, y2: 1.55).ease(0.1), 0)
    }

    func testControlPointsOfNamedEasings() {
        XCTAssertTrue(IndicatorSpec.Easing.linear.controlPoints == (0, 0, 1, 1))
        XCTAssertTrue(IndicatorSpec.Easing.easeIn.controlPoints == (0.42, 0, 1, 1))
        XCTAssertTrue(IndicatorSpec.Easing.easeOut.controlPoints == (0, 0, 0.58, 1))
        XCTAssertTrue(IndicatorSpec.Easing.easeInOut.controlPoints == (0.42, 0, 0.58, 1))
        XCTAssertTrue(IndicatorSpec.Easing.cubicBezier(x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4).controlPoints == (0.1, 0.2, 0.3, 0.4))
        XCTAssertEqual(IndicatorSpec.Easing(name: "easeOut"), .easeOut)
        XCTAssertNil(IndicatorSpec.Easing(name: "bounce"))
    }
}
