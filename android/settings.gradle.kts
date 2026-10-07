pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
    // A composite build can load only one Android Gradle plugin version, so a build that includes
    // this one may set `loaderKitAgpVersion` as an extra property on its Gradle object.
    val hostAgpVersion = gradle.parent?.extensions?.extraProperties
        ?.takeIf { it.has("loaderKitAgpVersion") }
        ?.get("loaderKitAgpVersion")
        ?.toString()
    if (hostAgpVersion != null) {
        resolutionStrategy.eachPlugin {
            if (requested.id.namespace == "com.android") useVersion(hostAgpVersion)
        }
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "loaderkit"

include(":loaderkit-core", ":loaderkit-compose")
