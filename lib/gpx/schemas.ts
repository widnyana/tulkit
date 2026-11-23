import { Effect, Result, Schema } from "effect";
import { InvalidPayload } from "./errors.ts";

const RoutingResponseSchema = Schema.Struct({
  coordinates: Schema.optional(
    Schema.NullOr(Schema.Array(Schema.Tuple([Schema.Number, Schema.Number]))),
  ),
});

type RoutingResponse = Schema.Schema.Type<typeof RoutingResponseSchema>;

const SnapResponseSchema = Schema.Struct({
  point: Schema.optional(
    Schema.NullOr(
      Schema.Struct({
        lat: Schema.optional(Schema.Number),
        lon: Schema.optional(Schema.Number),
      }),
    ),
  ),
  distance: Schema.optional(Schema.NullOr(Schema.Number)),
  reason: Schema.optional(Schema.Unknown),
});

type SnapResponse = Schema.Schema.Type<typeof SnapResponseSchema>;

const ElevationResponseSchema = Schema.Struct({
  elevations: Schema.optional(
    Schema.NullOr(Schema.Array(Schema.NullOr(Schema.Number))),
  ),
});

type ElevationResponse = Schema.Schema.Type<typeof ElevationResponseSchema>;

const PlaceListSchema = Schema.Array(Schema.Unknown);

type PlaceList = Schema.Schema.Type<typeof PlaceListSchema>;

const PlaceEntrySchema = Schema.Struct({
  lat: Schema.optional(Schema.Unknown),
  lon: Schema.optional(Schema.Unknown),
  display_name: Schema.optional(Schema.Unknown),
});

export type PlaceEntry = Schema.Schema.Type<typeof PlaceEntrySchema>;

const StoredEntrySchema = Schema.Struct({
  rawText: Schema.String,
  savedAt: Schema.Number,
});

export type StoredEntry = Schema.Schema.Type<typeof StoredEntrySchema>;

const toInvalidPayload = (message: string) => new InvalidPayload({ message });

export function decodeRouting(
  input: unknown,
): Effect.Effect<RoutingResponse, InvalidPayload> {
  return Schema.decodeUnknownEffect(RoutingResponseSchema)(input).pipe(
    Effect.mapError(() =>
      toInvalidPayload("The service returned an invalid route geometry."),
    ),
  );
}

export function decodeSnap(
  input: unknown,
): Effect.Effect<SnapResponse, InvalidPayload> {
  return Schema.decodeUnknownEffect(SnapResponseSchema)(input).pipe(
    Effect.mapError(() =>
      toInvalidPayload("The service returned an invalid snap."),
    ),
  );
}

export function decodeElevations(
  input: unknown,
): Effect.Effect<ElevationResponse, InvalidPayload> {
  return Schema.decodeUnknownEffect(ElevationResponseSchema)(input).pipe(
    Effect.mapError(() =>
      toInvalidPayload("The service returned invalid elevations."),
    ),
  );
}

export function decodePlaceList(
  input: unknown,
): Effect.Effect<PlaceList, InvalidPayload> {
  return Schema.decodeUnknownEffect(PlaceListSchema)(input).pipe(
    Effect.mapError(() =>
      toInvalidPayload("The service returned an invalid place list."),
    ),
  );
}

export function decodePlaceEntry(value: unknown): PlaceEntry | null {
  const result = Schema.decodeUnknownResult(PlaceEntrySchema)(value);
  return Result.isSuccess(result) ? result.success : null;
}

export function decodeStoredEntry(value: unknown): StoredEntry | null {
  const result = Schema.decodeUnknownResult(StoredEntrySchema)(value);
  return Result.isSuccess(result) ? result.success : null;
}
