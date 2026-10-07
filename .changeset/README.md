# Changesets

Every pull request that changes published behaviour adds a changeset:

```sh
npm run changeset
```

Pick the packages you changed and the bump (patch for fixes, minor for new features, major for
breaking changes), then write one or two sentences for the changelog. All packages share one
version (`fixed` in `config.json`): a changeset for any of them releases all of them, so the
`X.Y.Z` tag, npm, Maven Central and NuGet always carry the same version.

| Package | What it versions |
| --- | --- |
| `@loader-kit/spec` | the npm package in `spec/` (schema, JSON Schema, built-in indicators, evaluator) |
| `@loader-kit/web` | the npm package in `web/` (canvas view and `<loader-kit>` element) |
| `@loader-kit/android` | `io.github.maitrungduc1410:loaderkit-core` and `loaderkit-compose` |
| `@loader-kit/apple` | the Swift package and the `LoaderKit` pod |
| `@loader-kit/windows` | `LoaderKit.Core` and `LoaderKit.WinUI` on NuGet |

The release workflow turns pending changesets into a "chore: release X.Y.Z" pull request
(branch `release/X.Y.Z`); merging that pull request publishes everything. See
[CONTRIBUTING.md](../CONTRIBUTING.md#releasing).

You can also write the file by hand:

```md
---
'@loader-kit/android': patch
---

Fix the first frame of staggered indicators after the view is reattached.
```
