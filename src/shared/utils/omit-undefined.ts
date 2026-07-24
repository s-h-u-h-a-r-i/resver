export function omitUndefined<T extends object>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as {
    [K in keyof T as T[K] extends undefined ? never : K]: Exclude<
      T[K],
      undefined
    >;
  };
}
