import { type Cause, Data } from "effect";

export class ServiceUnavailable extends Data.TaggedError("ServiceUnavailable")<{
  readonly message: string;
}> {}

export class ServiceRejected extends Data.TaggedError("ServiceRejected")<{
  readonly status: number;
  readonly message: string;
}> {}

export class InvalidPayload extends Data.TaggedError("InvalidPayload")<{
  readonly message: string;
}> {}

export class InvalidInput extends Data.TaggedError("InvalidInput")<{
  readonly message: string;
}> {}

export type GpxRequestError =
  | ServiceUnavailable
  | ServiceRejected
  | InvalidPayload
  | InvalidInput
  | Cause.TimeoutError;
