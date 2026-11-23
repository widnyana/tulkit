import { Duration, Effect, Schedule } from "effect";
import {
  type GpxRequestError,
  InvalidPayload,
  ServiceRejected,
  ServiceUnavailable,
} from "./errors.ts";

export interface RequestPolicy {
  readonly schedule: Schedule.Schedule<unknown>;
  readonly timeout: Duration.Duration;
}

export const DEFAULT_REQUEST_POLICY: RequestPolicy = {
  schedule: Schedule.exponential(Duration.millis(250)).pipe(
    Schedule.upTo({ times: 2 }),
  ),
  timeout: Duration.seconds(8),
};

export function requestJson(
  url: string | URL,
  init: RequestInit,
  policy: RequestPolicy = DEFAULT_REQUEST_POLICY,
): Effect.Effect<unknown, GpxRequestError> {
  const external = init.signal;
  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: (signal) =>
        fetch(url, {
          ...init,
          signal: external ? AbortSignal.any([signal, external]) : signal,
        }),
      catch: () =>
        new ServiceUnavailable({ message: "The service did not answer." }),
    });
    if (!response.ok) {
      return yield* Effect.fail(
        new ServiceRejected({
          status: response.status,
          message: "The service rejected the request.",
        }),
      );
    }
    return yield* Effect.tryPromise({
      try: () => response.json() as Promise<unknown>,
      catch: () =>
        new InvalidPayload({
          message: "The service returned an invalid payload.",
        }),
    });
  }).pipe(
    Effect.retry({
      schedule: policy.schedule,
      while: (error: GpxRequestError) =>
        error._tag === "ServiceUnavailable" ||
        (error._tag === "ServiceRejected" && error.status >= 500),
    }),
    Effect.timeout(policy.timeout),
  );
}
