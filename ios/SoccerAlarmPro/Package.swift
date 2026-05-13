// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "SoccerAlarmPro",
    platforms: [.iOS(.v16)],
    targets: [
        .executableTarget(name: "SoccerAlarmPro", path: ".")
    ]
)