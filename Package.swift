// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "LoaderKit",
    platforms: [.iOS(.v15), .macOS(.v12)],
    products: [
        .library(name: "LoaderKit", targets: ["LoaderKit", "LoaderKitCore"]),
        .library(name: "LoaderKitCore", targets: ["LoaderKitCore"]),
    ],
    targets: [
        .target(
            name: "LoaderKitCore",
            path: "apple/Sources/LoaderKitCore"
        ),
        .target(
            name: "LoaderKit",
            dependencies: ["LoaderKitCore"],
            path: "apple/Sources/LoaderKit"
        ),
        .testTarget(
            name: "LoaderKitCoreTests",
            dependencies: ["LoaderKitCore"],
            path: "apple/Tests/LoaderKitCoreTests"
        ),
    ],
    swiftLanguageVersions: [.v5]
)
