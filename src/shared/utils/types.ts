type SnakeToCamelCase<
  S extends string,
  Depth extends number[] = [],
> = Depth['length'] extends 20
  ? S
  : S extends `${infer Head}_${infer Tail}`
    ? `${Head}${Capitalize<SnakeToCamelCase<Tail, [...Depth, 0]>>}`
    : S;

export type SnakeToCamelCaseKeys<T> = {
  [K in keyof T as K extends string ? SnakeToCamelCase<K> : K]: T[K];
};
