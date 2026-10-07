/** Own keys only: names such as `constructor` or `toString` must not resolve through the prototype. */
export function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}
