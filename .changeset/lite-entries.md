---
'@loader-kit/spec': minor
'@loader-kit/web': patch
---

`@loader-kit/spec/lite`: the spec API without the built-in indicator specs and the progress drawing code, for hosts whose native views draw, such as React Native. The React and Vue components of `@loader-kit/web` now keep each component in its own module, so a bundle only gets the custom elements of the components it imports.
