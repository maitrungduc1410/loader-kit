import com.vanniktech.maven.publish.MavenPublishBaseExtension
import groovy.json.JsonSlurper

plugins {
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.maven.publish) apply false
}

// Releases are versioned by android/package.json so the JavaScript release tooling owns the number.
val libraryVersion: String = providers
    .fileContents(layout.projectDirectory.file("package.json"))
    .asText
    .map { (JsonSlurper().parseText(it) as Map<*, *>)["version"] as String }
    .get()

subprojects {
    group = "io.github.maitrungduc1410"
    version = libraryVersion

    // A build that includes this one only consumes the libraries, and the publish plugin needs a newer
    // Android Gradle plugin than the including build may load.
    if (gradle.parent != null) return@subprojects

    pluginManager.withPlugin("com.android.library") {
        apply(plugin = "com.vanniktech.maven.publish")
        extensions.configure<MavenPublishBaseExtension> {
            coordinates(artifactId = project.name)
            publishToMavenCentral()
            // Lets `publishToMavenLocal` run without keys; Maven Central rejects unsigned uploads anyway.
            if (providers.gradleProperty("signingInMemoryKey").isPresent) signAllPublications()
            pom {
                name.set("LoaderKit " + project.name.removePrefix("loaderkit-").replaceFirstChar(Char::titlecase))
                description.set(provider { project.description })
                url.set("https://github.com/maitrungduc1410/loader-kit")
                inceptionYear.set("2026")
                licenses {
                    license {
                        name.set("MIT License")
                        url.set("https://opensource.org/licenses/MIT")
                        distribution.set("repo")
                    }
                }
                developers {
                    developer {
                        id.set("maitrungduc1410")
                        name.set("Mai Trung Duc")
                        url.set("https://github.com/maitrungduc1410/")
                    }
                }
                scm {
                    url.set("https://github.com/maitrungduc1410/loader-kit")
                    connection.set("scm:git:git://github.com/maitrungduc1410/loader-kit.git")
                    developerConnection.set("scm:git:ssh://git@github.com/maitrungduc1410/loader-kit.git")
                }
            }
        }
    }
}
