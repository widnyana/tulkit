const DEFAULT_HOST_ERROR = "Host is not allowed";

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
  allowedHosts: ReadonlyArray<string>,
): URL | null {
  const hostname = url.hostname.toLowerCase();

  if (!allowedHosts.includes(hostname)) {
    return null;
  }

  return new URL(`${url.pathname}${url.search}`, `https://${hostname}`);
}
