import { decodeBase64 } from "./base64.ts";

export interface DecodedJwt {
  header: string; // pretty-printed JSON
  payload: string; // pretty-printed JSON
  signature: string; // raw, undecoded — NOT verified
}

function decodeJsonPart(part: string, name: string): string {
  let json: string;
  try {
    json = decodeBase64(part);
  } catch {
    throw new Error(`JWT ${name} is not valid base64url`);
  }
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    throw new Error(`JWT ${name} is not valid JSON`);
  }
}

// Decodes a JWT's header and payload for display. The signature is returned raw
// and is NOT verified — verification needs the signing key, which this tool does
// not have.
export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    throw new Error("Not a JWT (expected 3 dot-separated parts)");
  }
  return {
    header: decodeJsonPart(parts[0], "header"),
    payload: decodeJsonPart(parts[1], "payload"),
    signature: parts[2],
  };
}
