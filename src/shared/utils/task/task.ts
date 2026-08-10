const ResultTypeId: unique symbol = Symbol('ResultTypeId');

export interface Ok<A> {
  readonly [ResultTypeId]: true;
  readonly ok: true;
  readonly value: A;
}

export interface Err<E> {
  readonly [ResultTypeId]: true;
  readonly ok: false;
  readonly error: E;
}

export type ResultType<A, E = never> = Ok<A> | Err<E>;

type AnyResult = ResultType<unknown, unknown>;

export const Result = {
  void: voidResult,
  ok,
  err,
  isOk,
} as const;

function voidResult(): Ok<void> {
  return { [ResultTypeId]: true, ok: true, value: undefined };
}

function ok<A>(value: A): Ok<A> {
  return { [ResultTypeId]: true, ok: true, value };
}

function err<E>(error: E): Err<E> {
  return { [ResultTypeId]: true, ok: false, error };
}

function isOk<R extends AnyResult>(
  result: R,
): result is Extract<R, Ok<unknown>> {
  return result.ok;
}

const TaskTypeId: unique symbol = Symbol('TaskTypeId');
const TaskRunId: unique symbol = Symbol('TaskRunId');

type AnyTask = Task<unknown, unknown>;

type TaskSuccess<T> = T extends Task<infer A, unknown> ? A : never;

type TaskFailure<T> = T extends Task<unknown, infer E> ? E : never;

type TaskSuccesses<Tasks extends readonly AnyTask[]> = {
  -readonly [Index in keyof Tasks]: TaskSuccess<Tasks[Index]>;
};

type FnRawSuccess<Output> =
  Output extends Ok<infer A> ? A : Output extends Err<unknown> ? never : Output;

type FnSuccess<Output> = [FnRawSuccess<Output>] extends [undefined]
  ? void
  : FnRawSuccess<Output>;

type FnFailure<Output> = Output extends Err<infer E> ? E : never;

export interface Task<out A, out E = never> {
  readonly [TaskTypeId]: {
    readonly _A: (_: never) => A;
    readonly _E: (_: never) => E;
  };

  readonly [TaskRunId]: () => Promise<ResultType<A, E>>;

  [Symbol.iterator](): Generator<Task<A, E>, A, unknown>;

  pipe(): Task<A, E>;
  pipe<B>(operation: (self: Task<A, E>) => B): B;
  pipe<B, C>(
    operation1: (self: Task<A, E>) => B,
    operation2: (value: B) => C,
  ): C;
  pipe<B, C, D>(
    operation1: (self: Task<A, E>) => B,
    operation2: (value: B) => C,
    operation3: (value: C) => D,
  ): D;
  pipe<B, C, D, F>(
    operation1: (self: Task<A, E>) => B,
    operation2: (value: B) => C,
    operation3: (value: C) => D,
    operation4: (value: D) => F,
  ): F;
  pipe<B, C, D, F, G>(
    operation1: (self: Task<A, E>) => B,
    operation2: (value: B) => C,
    operation3: (value: C) => D,
    operation4: (value: D) => F,
    operation5: (value: F) => G,
  ): G;
}

class TaskImpl<A, E> implements Task<A, E> {
  declare readonly [TaskTypeId]: {
    readonly _A: (_: never) => A;
    readonly _E: (_: never) => E;
  };

  readonly [TaskRunId]: () => Promise<ResultType<A, E>>;
  readonly pipe = ((...operations: PipeOperation[]) =>
    pipeArguments(this, operations)) as Task<A, E>['pipe'];

  constructor(execute: () => Promise<ResultType<A, E>>) {
    this[TaskRunId] = execute;
  }

  *[Symbol.iterator](): Generator<Task<A, E>, A, unknown> {
    return (yield this) as A;
  }
}

type PipeOperation = (value: never) => unknown;

function pipeArguments(self: unknown, operations: ArrayLike<PipeOperation>) {
  let result = self;

  for (let index = 0; index < operations.length; index++) {
    result = operations[index]!(result as never);
  }

  return result;
}

export const Task = {
  Error: taskError,
  make,
  fn,
  succeed,
  fail,
  fromResult,
  tryPromise,
  map,
  mapError,
  flatMap,
  tap,
  tapError,
  asVoid,
  all,
  gen,
  run,
  runResult,
  runOrThrow,
} as const;

function taskError<const Tag extends string>(tag: Tag) {
  return class extends Error {
    readonly _tag = tag;

    constructor(message: string) {
      super(message);
      this.name = tag;
    }
  };
}

function make<A, E = never>(
  execute: () => Promise<ResultType<A, E>>,
): Task<A, E> {
  return new TaskImpl(execute);
}

function fn<Args extends readonly unknown[], Output>(
  execute: (...args: Args) => Promise<Output>,
): (...args: Args) => Task<FnSuccess<Output>, FnFailure<Output>> {
  return (...args) =>
    make<FnSuccess<Output>, FnFailure<Output>>(async () => {
      const output = (await execute(...args)) as Output;

      return isResult(output)
        ? (output as ResultType<FnSuccess<Output>, FnFailure<Output>>)
        : Result.ok(output as FnSuccess<Output>);
    });
}

function isResult(value: unknown): value is AnyResult {
  return typeof value === 'object' && value !== null && ResultTypeId in value;
}

function succeed<A>(value: A): Task<A> {
  return make(async () => Result.ok(value));
}

function fail<E>(error: E): Task<never, E> {
  return make(async () => Result.err(error));
}

function fromResult<A, E = never>(result: ResultType<A, E>): Task<A, E> {
  return make(async () => result);
}

function tryPromise<A, E>(
  execute: () => Promise<A>,
  onError: (cause: unknown) => E,
): Task<A, E> {
  return make(async () => {
    try {
      return Result.ok(await execute());
    } catch (cause) {
      return Result.err(onError(cause));
    }
  });
}

function map<A, B>(
  transform: (value: A) => B,
): <E>(self: Task<A, E>) => Task<B, E> {
  return (self) =>
    make(async () => {
      const result = await runResult(self);
      return Result.isOk(result) ? Result.ok(transform(result.value)) : result;
    });
}

function mapError<E, F>(
  transform: (error: E) => F,
): <A>(self: Task<A, E>) => Task<A, F> {
  return (self) =>
    make(async () => {
      const result = await runResult(self);
      return Result.isOk(result) ? result : Result.err(transform(result.error));
    });
}

function flatMap<A, B, F>(
  transform: (value: A) => Task<B, F>,
): <E>(self: Task<A, E>) => Task<B, E | F> {
  return <E>(self: Task<A, E>) =>
    make<B, E | F>(async () => {
      const result = await runResult(self);
      return Result.isOk(result) ? runResult(transform(result.value)) : result;
    });
}

function tap<A>(
  effect: (value: A) => void,
): <E>(self: Task<A, E>) => Task<A, E> {
  return map((value: A) => {
    effect(value);
    return value;
  });
}

function tapError<E>(
  effect: (error: E) => void,
): <A>(self: Task<A, E>) => Task<A, E> {
  return (self) =>
    make(async () => {
      const result = await runResult(self);
      if (!Result.isOk(result)) effect(result.error);
      return result;
    });
}

function asVoid<A, E>(self: Task<A, E>): Task<void, E> {
  return map(() => undefined)(self);
}

function all<const Tasks extends readonly AnyTask[]>(
  tasks: Tasks,
): Task<TaskSuccesses<Tasks>, TaskFailure<Tasks[number]>> {
  return make(async () => {
    const results = await Promise.all(tasks.map(runResult));
    const values: unknown[] = [];

    for (const result of results) {
      if (!Result.isOk(result)) {
        return Result.err(result.error as TaskFailure<Tasks[number]>);
      }

      values.push(result.value);
    }

    return Result.ok(values as TaskSuccesses<Tasks>);
  });
}

function gen<Yielded extends AnyTask, A>(
  body: () => Generator<Yielded, A, unknown>,
): Task<A, TaskFailure<Yielded>> {
  return make(async () => {
    const iterator = body();
    let state = iterator.next();

    while (!state.done) {
      const result = await runResult(state.value);

      if (!Result.isOk(result)) {
        return Result.err(result.error as TaskFailure<Yielded>);
      }

      state = iterator.next(result.value);
    }

    return Result.ok(state.value);
  });
}

async function run<A>(self: Task<A, never>): Promise<A> {
  const result = await runResult(self);
  if (Result.isOk(result)) return result.value;
  throw result.error;
}

function runResult<A, E>(self: Task<A, E>): Promise<ResultType<A, E>> {
  return self[TaskRunId]();
}

async function runOrThrow<A, E>(self: Task<A, E>): Promise<A> {
  const result = await runResult(self);
  if (Result.isOk(result)) return result.value;
  throw result.error;
}
