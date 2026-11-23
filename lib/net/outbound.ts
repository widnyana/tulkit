import { Data, Duration, Effect } from "effect";

const DEFAULT_HOST_ERROR = "Host is not allowed";

export interface OriginRule {
  readonly host: string;
  readonly origin: string;
}

export class BlockedTarget extends Data.TaggedError("BlockedTarget")<{
  readonly reason: string;
}> {}

export class TooManyRedirects extends Data.TaggedError("TooManyRedirects") {}

export class RequestTimeout extends Data.TaggedError("RequestTimeout") {}

export class UpstreamFailure extends Data.TaggedError("UpstreamFailure")<{
  readonly status: number;
}> {}

export type OutboundError =
  | BlockedTarget
  | TooManyRedirects
  | RequestTimeout
  | UpstreamFailure;

export interface AllowedResponse {
  readonly response: Response;
  readonly finalUrl: URL;
}

export const isHttpProtocol = (url: URL): boolean =>
  url.protocol === "http:" || url.protocol === "https:";

export const isPrivateHostname = (hostname: string): boolean =>
  hostname === "localhost" ||
  hostname.startsWith("127.") ||
  hostname.startsWith("10.") ||
  hostname.startsWith("192.168.") ||
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
  hostname.startsWith("169.254.") ||
  hostname.endsWith(".local") ||
  hostname.endsWith(".localhost");

export function validateOutbound(
  raw: string,
  allowedHosts: ReadonlyArray<string>,
  hostError: string = DEFAULT_HOST_ERROR,
): { readonly url: URL } | { readonly error: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { error: "Invalid URL format" };
  }

  if (!isHttpProtocol(url)) {
    return { error: "Only HTTP and HTTPS URLs are allowed" };
  }

  const hostname = url.hostname.toLowerCase();

  if (!allowedHosts.includes(hostname)) {
    return { error: hostError };
  }

  if (isPrivateHostname(hostname)) {
    return { error: "Access to private/internal networks is not allowed" };
  }

  return { url };
}

export function pinnedUrl(
  url: URL,
  rules: ReadonlyArray<OriginRule>,
): URL | null {
  const hostname = url.hostname.toLowerCase();

  for (const rule of rules) {
    if (rule.host === hostname) {
      const target = new URL(rule.origin);
      target.pathname = url.pathname;
      target.search = url.search;
      return target.hostname === rule.host ? target : null;
    }
  }

  return null;
}

export const hostsOf = (rules: ReadonlyArray<OriginRule>): string[] =>
  rules.map((rule) => rule.host);

export function parseOriginRules(value: string | undefined): OriginRule[] {
  if (!value) return [];
  const rules: OriginRule[] = [];
  for (const entry of value.split(",")) {
    const trimmed = entry.trim();
    if (trimmed === "") continue;
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      continue;
    }
    if (url.protocol !== "https:") continue;
    rules.push({ host: url.hostname.toLowerCase(), origin: url.origin });
  }
  return rules;
}

export function mergeRules(
  base: ReadonlyArray<OriginRule>,
  extra: ReadonlyArray<OriginRule>,
): OriginRule[] {
  const byHost = new Map<string, OriginRule>();
  for (const rule of base) byHost.set(rule.host, rule);
  for (const rule of extra) byHost.set(rule.host, rule);
  return [...byHost.values()];
}

export function fetchAllowed(
  raw: string,
  rules: ReadonlyArray<OriginRule>,
  options: {
    headers: HeadersInit;
    timeoutMs: number;
    maxRedirects: number;
    hostError: string;
  },
): Effect.Effect<AllowedResponse, OutboundError> {
  return Effect.gen(function* () {
    const hosts = hostsOf(rules);
    const validation = validateOutbound(raw, hosts, options.hostError);

    if ("error" in validation) {
      return yield* Effect.fail(
        new BlockedTarget({ reason: validation.error }),
      );
    }

    let currentUrl = validation.url;
    const initialUrl = pinnedUrl(currentUrl, rules);

    if (!initialUrl) {
      return yield* Effect.fail(
        new BlockedTarget({ reason: options.hostError }),
      );
    }

    const initialTarget = initialUrl.toString();

    let response = yield* Effect.tryPromise({
      try: (signal) =>
        fetch(initialTarget, {
          headers: options.headers,
          signal,
          redirect: "manual",
        }),
      catch: () => new UpstreamFailure({ status: 0 }),
    }).pipe(
      Effect.timeout(Duration.millis(options.timeoutMs)),
      Effect.catchTag("TimeoutError", () => Effect.fail(new RequestTimeout())),
    );

    for (let redirects = 0; redirects < options.maxRedirects; redirects++) {
      if (response.status < 300 || response.status >= 400) {
        break;
      }

      const location = response.headers.get("location");
      if (!location) {
        break;
      }

      currentUrl = yield* Effect.try({
        try: () => new URL(location, currentUrl),
        catch: () => new UpstreamFailure({ status: 0 }),
      });

      const redirectValidation = validateOutbound(
        currentUrl.toString(),
        hosts,
        options.hostError,
      );
      if ("error" in redirectValidation) {
        return yield* Effect.fail(
          new BlockedTarget({ reason: redirectValidation.error }),
        );
      }
      currentUrl = redirectValidation.url;

      const redirectUrl = pinnedUrl(currentUrl, rules);
      if (!redirectUrl) {
        return yield* Effect.fail(
          new BlockedTarget({ reason: options.hostError }),
        );
      }

      const redirectTarget = redirectUrl.toString();

      response = yield* Effect.tryPromise({
        try: (signal) =>
          fetch(redirectTarget, {
            headers: options.headers,
            signal,
            redirect: "manual",
          }),
        catch: () => new UpstreamFailure({ status: 0 }),
      }).pipe(
        Effect.timeout(Duration.millis(options.timeoutMs)),
        Effect.catchTag("TimeoutError", () =>
          Effect.fail(new RequestTimeout()),
        ),
      );
    }

    if (response.status >= 300 && response.status < 400) {
      return yield* Effect.fail(new TooManyRedirects());
    }

    return { response, finalUrl: currentUrl };
  });
}
