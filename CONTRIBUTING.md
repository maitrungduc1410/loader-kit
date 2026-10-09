# Contributing

## Repository layout

| Path | Contents |
| --- | --- |
| `SPEC.md` | the indicator spec: meaning of every field and the rules every engine follows |
| `spec/` | `@loader-kit/spec`: TypeScript schema, JSON Schema, reference evaluator, validator, built-in indicators, progress geometry, generator |
| `web/` | `@loader-kit/web`: canvas renderer, `LoaderKitView`, `LoaderKitProgressView`, the `<loader-kit>` and `<loader-kit-progress>` custom elements and the React, Vue and Svelte components |
| `test-vectors/` | generated conformance suite, run by the tests of every engine (`test-vectors/progress/` for the progress indicators) |
| `android/` | Gradle project: `loaderkit-core` (View) and `loaderkit-compose` |
| `Package.swift`, `apple/` | Swift package: `LoaderKitCore` (pure Swift) and `LoaderKit` (Core Animation, UIKit, AppKit, SwiftUI) |
| `LoaderKit.podspec` | the same sources as a pod, consumed with `:git` and `:tag` |
| `windows/` | `LoaderKit.Core` (.NET) and `LoaderKit.WinUI` (WinUI 3) |
| `docs/` | the documentation site (VitePress), with the playground and the interactive examples |

Requirements: Node.js 22.18 or newer (`.nvmrc`), JDK 17 and the Android SDK for `android/`,
Swift 5.9 or newer for `apple/` (Xcode 16 for the UI code), .NET 8 SDK for `windows/`
(Windows for `LoaderKit.WinUI`).

## The spec is the source of truth

Built-in indicators live in `spec/src/indicators/`, one file per indicator, written with
`defineIndicator()`. After adding or changing one, or changing the evaluator:

```sh
npm install
npm run generate   # test-vectors/, spec/schema.json and the BuiltinIndicatorSpecs file of each platform
npm test
```

Commit the generated files with your change; CI fails when they are out of date
(`npm run check:generated`). Never edit `test-vectors/`, `spec/schema.json` or
`**/BuiltinIndicatorSpecs.*` by hand. The JSON Schema is built by `spec/scripts/schema.ts`; a new
spec field goes there too.

A change in behaviour goes into `SPEC.md`, the reference evaluator and every engine in the same
pull request, with a test vector that covers it (`spec/scripts/edge-cases.ts` holds synthetic
specs for rules the built-in indicators do not exercise).

Progress indicators are not specs, but follow the same idea. `spec/src/progress/` is the reference:
it resolves the options, runs the value glide and turns both into draw commands. Each platform
ports it (`ProgressGeometry` and `ProgressAnimator` in Kotlin, Swift and C#) and only maps the
commands to its canvas. `npm run generate` writes `test-vectors/progress/` from
`spec/scripts/progress-vectors.ts`; a change in the geometry goes into the reference, every port
and a vector in the same pull request.

## Running the checks

```sh
npm test && npm run typecheck                 # spec and web
(cd android && ./gradlew :loaderkit-core:testDebugUnitTest assembleRelease)
swift test                                    # apple, also works on Linux for LoaderKitCore
dotnet test windows/LoaderKit.Core.Tests      # windows
```

## Documentation

The site in `docs/` is published to https://maitrungduc1410.github.io/loader-kit/ by the
[docs workflow](.github/workflows/docs.yml): it builds on every pull request and deploys on every
push to `master`. Its live examples import `spec/src` and `web/src` directly, so they always show
the code of the current commit.

```sh
npm run docs:dev      # local server with hot reload
npm run docs:build    # static build into docs/.vitepress/dist, fails on dead links
```

Pages exist in English (`docs/`), Vietnamese (`docs/vi/`) and Chinese (`docs/zh/`); change all
three together. Write the translations the way developers there actually talk: terms such as
render, spec, params, easing or playground stay as they are. Translated headings keep the
English anchor (`## Cài đặt {#installation}`) so links work in every language. Every page needs a
unique `description` in its frontmatter, which feeds the search and social preview tags.

## Changesets

Every pull request that changes published behaviour adds a changeset with `npm run changeset`;
see [.changeset/README.md](.changeset/README.md). Changes that users do not see (docs, CI,
tests) do not need one.

## Releasing

Releases are automated by the [release workflow](.github/workflows/release.yml). Nobody publishes
from a local machine, apart from the one-time setup below.

1. When pull requests with changesets are merged into `master`, the workflow opens (or updates)
   the release pull request `chore: release X.Y.Z` from branch `release/X.Y.Z`. It bumps every
   package to the same version, writes the changelogs and removes the consumed changesets (in
   prerelease mode they move to `.changeset/pre/`). The
   workflow also starts CI on that branch, since pushes made by the workflow do not trigger it.
   Manual runs of the release workflow publish only from `master`.
2. Review that pull request. To reword an entry, edit the changeset on `master`: the release
   branch is rebuilt on every run.
3. Merging it runs CI again, then publishes whatever is missing for that version:
   `@loader-kit/spec` and `@loader-kit/web` on npm, `loaderkit-core` and `loaderkit-compose` on Maven Central,
   `LoaderKit.Core` and `LoaderKit.WinUI` on NuGet. Last, it creates the GitHub release and the
   tag `X.Y.Z` (no `v` prefix), which is what Swift Package Manager and CocoaPods resolve.

Every step checks first whether its version is already published, so a failed run can simply be
rerun. A version with a prerelease suffix such as `1.0.0-rc.0` goes to the npm dist-tag `next`
and is marked as a prerelease on GitHub.

The repository is in Changesets prerelease mode (`.changeset/pre.json`, tag `rc`) until 1.0.0.
To release 1.0.0, merge a pull request that runs `npx changeset pre exit`: the workflow then
opens the release pull request for 1.0.0, even when no new changeset was added.

### One-time setup

- **npm**: trusted publishing can only be configured for a package that exists, so publish the
  first version of `@loader-kit/spec` and then `@loader-kit/web` by hand (`npm run build && npm
  publish --workspace @loader-kit/spec --workspace @loader-kit/web --access public --tag next`),
  then add this repository and `release.yml` as a trusted publisher in the settings of both
  packages on npmjs.com.
- **Maven Central**: repository secrets `MAVEN_CENTRAL_USERNAME` and `MAVEN_CENTRAL_PASSWORD` (a
  Central Portal user token for the verified namespace `io.github.maitrungduc1410`), and
  `GPG_SIGNING_KEY` (ASCII-armored private key), `GPG_SIGNING_KEY_ID`, `GPG_SIGNING_PASSWORD`.
- **NuGet**: add a trusted publishing policy for this repository and `release.yml` on nuget.org,
  and set the repository variable `NUGET_USER` to the nuget.org user name.
- **GitHub Pages**: in the repository settings, set Pages > Source to "GitHub Actions" so the docs
  workflow can deploy.
