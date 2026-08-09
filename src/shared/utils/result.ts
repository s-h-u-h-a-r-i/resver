export interface Ok<A> {
  readonly ok: true;
  readonly value: A;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

export type Result<A, E = never> = Ok<A> | Err<E>;

type AnyResult = Result<unknown, unknown>;

type ResultSuccess<R> = R extends Ok<infer A> ? A : never;

type ResultFailure<R> = R extends Err<infer E> ? E : never;

type AndThenResult<R, Next> = Result<
  ResultSuccess<Next>,
  ResultFailure<R> | ResultFailure<Next>
>;

export const Result = {
  Error: resultError,
  void: voidResult,
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  andThen,
  match,
  catchTags,
  unwrapOr,
  unwrapOrElse,
  unwrapOrThrow,
  pipe,
  tap,
  tapErr,
} as const;

function voidResult(): Result<void, never> {
  return { ok: true, value: undefined };
}

function ok<A>(value: A): Result<A, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

function isOk<R extends Result<unknown, unknown>>(
  result: R,
): result is Extract<R, Ok<unknown>> {
  return result.ok;
}

function isErr<R extends Result<unknown, unknown>>(
  result: R,
): result is Extract<R, Err<unknown>> {
  return !result.ok;
}

function resultError<const Tag extends string>(tag: Tag) {
  return class extends Error {
    readonly _tag = tag;

    constructor(message: string) {
      super(message);
      this.name = tag;
    }
  };
}

function map<R extends AnyResult, B>(
  fn: (value: ResultSuccess<R>) => B,
): (result: R) => Result<B, ResultFailure<R>>;
function map<R extends AnyResult, B>(
  result: R,
  fn: (value: ResultSuccess<R>) => B,
): Result<B, ResultFailure<R>>;
function map<R extends AnyResult, B>(
  resultOrFn: R | ((value: ResultSuccess<R>) => B),
  maybeFn?: (value: ResultSuccess<R>) => B,
) {
  if (typeof resultOrFn === 'function') {
    const fn = resultOrFn;

    return (result: R): Result<B, ResultFailure<R>> =>
      result.ok
        ? ok(fn(result.value as ResultSuccess<R>))
        : (result as Result<B, ResultFailure<R>>);
  }

  const result = resultOrFn;
  const fn = maybeFn!;

  return result.ok
    ? ok(fn(result.value as ResultSuccess<R>))
    : (result as Result<B, ResultFailure<R>>);
}

function mapErr<R extends AnyResult, F>(
  fn: (error: ResultFailure<R>) => F,
): (result: R) => Result<ResultSuccess<R>, F>;
function mapErr<R extends AnyResult, F>(
  result: R,
  fn: (error: ResultFailure<R>) => F,
): Result<ResultSuccess<R>, F>;
function mapErr<R extends AnyResult, F>(
  resultOrFn: R | ((error: ResultFailure<R>) => F),
  maybeFn?: (error: ResultFailure<R>) => F,
) {
  if (typeof resultOrFn === 'function') {
    const fn = resultOrFn;

    return (result: R): Result<ResultSuccess<R>, F> =>
      result.ok
        ? (result as Result<ResultSuccess<R>, F>)
        : err(fn(result.error as ResultFailure<R>));
  }

  const result = resultOrFn;
  const fn = maybeFn!;

  return result.ok
    ? (result as Result<ResultSuccess<R>, F>)
    : err(fn(result.error as ResultFailure<R>));
}

function andThen<R extends AnyResult, Next extends AnyResult>(
  fn: (value: ResultSuccess<R>) => Next,
): (result: R) => AndThenResult<R, Next>;
function andThen<R extends AnyResult, Next extends AnyResult>(
  result: R,
  fn: (value: ResultSuccess<R>) => Next,
): AndThenResult<R, Next>;
function andThen<R extends AnyResult, Next extends AnyResult>(
  resultOrFn: R | ((value: ResultSuccess<R>) => Next),
  maybeFn?: (value: ResultSuccess<R>) => Next,
) {
  if (typeof resultOrFn === 'function') {
    const fn = resultOrFn;

    return (result: R): AndThenResult<R, Next> =>
      result.ok
        ? (fn(result.value as ResultSuccess<R>) as AndThenResult<R, Next>)
        : (result as AndThenResult<R, Next>);
  }

  const result = resultOrFn;
  const fn = maybeFn!;

  return result.ok
    ? (fn(result.value as ResultSuccess<R>) as AndThenResult<R, Next>)
    : (result as AndThenResult<R, Next>);
}

type MatchCases<R extends AnyResult, T> = {
  ok: (value: ResultSuccess<R>) => T;
  err: (error: ResultFailure<R>) => T;
};

function match<R extends AnyResult, T>(
  cases: MatchCases<R, T>,
): (result: R) => T;
function match<R extends AnyResult, T>(result: R, cases: MatchCases<R, T>): T;
function match<R extends AnyResult, T>(
  resultOrCases: R | MatchCases<R, T>,
  maybeCases?: MatchCases<R, T>,
) {
  if (maybeCases) {
    const result = resultOrCases as R;

    return result.ok
      ? maybeCases.ok(result.value as ResultSuccess<R>)
      : maybeCases.err(result.error as ResultFailure<R>);
  }

  const cases = resultOrCases as MatchCases<R, T>;

  return (result: R): T =>
    result.ok
      ? cases.ok(result.value as ResultSuccess<R>)
      : cases.err(result.error as ResultFailure<R>);
}

type TaggedError = {
  readonly _tag: string;
};

type CaseResult<Cases> = ReturnType<
  Extract<Cases[keyof Cases], (...args: never[]) => AnyResult>
>;

type Tags<E> = Extract<E, TaggedError>['_tag'];

type CasesFor<E> = {
  [Tag in Tags<E>]+?: (error: Extract<E, { readonly _tag: Tag }>) => AnyResult;
};

type CatchTagsResult<A, E, Cases> = Result<
  A | ResultSuccess<CaseResult<Cases>>,
  Exclude<E, { readonly _tag: keyof Cases }> | ResultFailure<CaseResult<Cases>>
>;

function catchTags<
  E,
  Cases extends CasesFor<E> &
    (unknown extends E
      ? object
      : {
          [Tag in Exclude<keyof Cases, Tags<E>>]: never;
        }),
>(cases: Cases): <A>(result: Result<A, E>) => CatchTagsResult<A, E, Cases>;
function catchTags<
  A,
  E,
  Cases extends CasesFor<E> &
    (unknown extends E
      ? object
      : {
          [Tag in Exclude<keyof Cases, Tags<E>>]: never;
        }),
>(result: Result<A, E>, cases: Cases): CatchTagsResult<A, E, Cases>;
function catchTags<A, E>(
  resultOrCases: Result<A, E> | Record<string, (error: never) => AnyResult>,
  maybeCases?: Record<string, (error: never) => AnyResult>,
) {
  if (maybeCases) {
    return catchTagsResult(resultOrCases as Result<A, E>, maybeCases);
  }

  const cases = resultOrCases as Record<string, (error: never) => AnyResult>;

  return (result: Result<A, E>) => catchTagsResult(result, cases);
}

function catchTagsResult<A, E>(
  result: Result<A, E>,
  cases: Record<string, (error: never) => AnyResult>,
): Result<unknown, unknown> {
  if (result.ok || !isTaggedError(result.error)) {
    return result;
  }

  const handler = cases[result.error._tag];
  return handler ? handler(result.error as never) : result;
}

function isTaggedError(error: unknown): error is TaggedError {
  return (
    typeof error === 'object' &&
    error !== null &&
    '_tag' in error &&
    typeof error._tag === 'string'
  );
}

function unwrapOr<B>(
  defaultValue: B,
): <R extends AnyResult>(result: R) => ResultSuccess<R> | B;
function unwrapOr<R extends AnyResult, B>(
  result: R,
  defaultValue: B,
): ResultSuccess<R> | B;
function unwrapOr<R extends AnyResult, B>(
  resultOrDefault: R | B,
  maybeDefault?: B,
) {
  if (arguments.length === 2) {
    const result = resultOrDefault as R;

    return result.ok ? (result.value as ResultSuccess<R>) : maybeDefault;
  }

  const defaultValue = resultOrDefault as B;

  return <TResult extends AnyResult>(
    result: TResult,
  ): ResultSuccess<TResult> | B =>
    result.ok ? (result.value as ResultSuccess<TResult>) : defaultValue;
}

function unwrapOrElse<R extends AnyResult, A>(
  fn: (error: ResultFailure<R>) => A,
): (result: R) => ResultSuccess<R> | A;
function unwrapOrElse<R extends AnyResult, A>(
  result: R,
  fn: (error: ResultFailure<R>) => A,
): ResultSuccess<R> | A;
function unwrapOrElse<R extends AnyResult, A>(
  resultOrFn: R | ((error: ResultFailure<R>) => A),
  maybeFn?: (error: ResultFailure<R>) => A,
) {
  if (typeof resultOrFn === 'function') {
    const fn = resultOrFn;

    return (result: R): ResultSuccess<R> | A =>
      result.ok
        ? (result.value as ResultSuccess<R>)
        : fn(result.error as ResultFailure<R>);
  }

  const result = resultOrFn;
  const fn = maybeFn!;

  return result.ok
    ? (result.value as ResultSuccess<R>)
    : fn(result.error as ResultFailure<R>);
}

function unwrapOrThrow<R extends Result<unknown, unknown>>(
  result: R,
): ResultSuccess<R> {
  if (result.ok) {
    return result.value as ResultSuccess<R>;
  }

  throw result.error;
}

function tap<R extends AnyResult>(
  fn: (value: ResultSuccess<R>) => void,
): (result: R) => R;
function tap<R extends AnyResult>(
  result: R,
  fn: (value: ResultSuccess<R>) => void,
): R;
function tap<R extends AnyResult>(
  resultOrFn: R | ((value: ResultSuccess<R>) => void),
  maybeFn?: (value: ResultSuccess<R>) => void,
) {
  if (typeof resultOrFn === 'function') {
    const fn = resultOrFn;

    return (result: R): R => {
      if (result.ok) {
        fn(result.value as ResultSuccess<R>);
      }

      return result;
    };
  }

  const result = resultOrFn;
  const fn = maybeFn!;

  if (result.ok) {
    fn(result.value as ResultSuccess<R>);
  }

  return result;
}

function tapErr<R extends Result<unknown, unknown>>(
  fn: (error: ResultFailure<R>) => void,
): (result: R) => R;
function tapErr<R extends Result<unknown, unknown>>(
  result: R,
  fn: (error: ResultFailure<R>) => void,
): R;
function tapErr<R extends Result<unknown, unknown>>(
  resultOrFn: R | ((error: ResultFailure<R>) => void),
  maybeFn?: (error: ResultFailure<R>) => void,
) {
  if (typeof resultOrFn === 'function') {
    const fn = resultOrFn;

    return (result: R): R => {
      if (!result.ok) {
        fn(result.error as ResultFailure<R>);
      }

      return result;
    };
  }

  const result = resultOrFn;
  const fn = maybeFn!;

  if (!result.ok) {
    fn(result.error as ResultFailure<R>);
  }

  return result;
}

function pipe<A>(value: A): A;

function pipe<A, B>(value: A, fn1: (value: A) => B): B;

function pipe<A, B, C>(value: A, fn1: (value: A) => B, fn2: (value: B) => C): C;

function pipe<A, B, C, D>(
  value: A,
  fn1: (value: A) => B,
  fn2: (value: B) => C,
  fn3: (value: C) => D,
): D;

function pipe<A, B, C, D, E>(
  value: A,
  fn1: (value: A) => B,
  fn2: (value: B) => C,
  fn3: (value: C) => D,
  fn4: (value: D) => E,
): E;

function pipe<A, B, C, D, E, F>(
  value: A,
  fn1: (value: A) => B,
  fn2: (value: B) => C,
  fn3: (value: C) => D,
  fn4: (value: D) => E,
  fn5: (value: E) => F,
): F;

function pipe<A, B, C, D, E, F, G>(
  value: A,
  fn1: (value: A) => B,
  fn2: (value: B) => C,
  fn3: (value: C) => D,
  fn4: (value: D) => E,
  fn5: (value: E) => F,
  fn6: (value: F) => G,
): G;

function pipe<A, B, C, D, E, F, G, H>(
  value: A,
  fn1: (value: A) => B,
  fn2: (value: B) => C,
  fn3: (value: C) => D,
  fn4: (value: D) => E,
  fn5: (value: E) => F,
  fn6: (value: F) => G,
  fn7: (value: G) => H,
): H;

function pipe<A, B, C, D, E, F, G, H, I>(
  value: A,
  fn1: (value: A) => B,
  fn2: (value: B) => C,
  fn3: (value: C) => D,
  fn4: (value: D) => E,
  fn5: (value: E) => F,
  fn6: (value: F) => G,
  fn7: (value: G) => H,
  fn8: (value: H) => I,
): I;

function pipe<A, B, C, D, E, F, G, H, I, J>(
  value: A,
  fn1: (value: A) => B,
  fn2: (value: B) => C,
  fn3: (value: C) => D,
  fn4: (value: D) => E,
  fn5: (value: E) => F,
  fn6: (value: F) => G,
  fn7: (value: G) => H,
  fn8: (value: H) => I,
  fn9: (value: I) => J,
): J;

function pipe(
  value: unknown,
  ...fns: Array<(value: never) => unknown>
): unknown {
  return fns.reduce<unknown>((current, fn) => fn(current as never), value);
}
