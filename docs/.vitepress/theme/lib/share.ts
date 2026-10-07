// Playground share links: the spec travels in the URL hash, so nothing is sent to a server.
//   #spec=<base64url of the deflate-raw compressed JSON>
//   #json=<base64url of the UTF-8 JSON>, when CompressionStream is missing
//   #example=<id> and #indicator=<Name> open an example or a built-in.

export type HashTarget =
  | { kind: 'spec'; json: string }
  | { kind: 'example'; id: string }
  | { kind: 'indicator'; name: string };

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** A link that cannot be opened for a reason the playground can explain in the page language. */
export class ShareLinkError extends Error {
  constructor(readonly reason: 'tooLarge' | 'noDecompression') {
    super(reason === 'tooLarge' ? 'The shared spec is larger than 1 MB.' : 'This browser cannot decompress the shared spec.');
  }
}

/** A crafted link can inflate far past its own size, so decoding stops at this many bytes. */
export const MAX_SHARED_SPEC_BYTES = 1024 * 1024;

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const output = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(output).arrayBuffer());
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_SHARED_SPEC_BYTES) {
      await reader.cancel();
      throw new ShareLinkError('tooLarge');
    }
    chunks.push(value);
  }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

const canCompress = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

/** The hash (without `#`) that reopens `json` in the playground. */
export async function encodeSpecHash(json: string): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  if (canCompress()) {
    try {
      return `spec=${toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')))}`;
    } catch {
      // Some engines list the constructor but not the deflate-raw format.
    }
  }
  return `json=${toBase64Url(bytes)}`;
}

/** Reads a playground hash. Throws when a `spec` or `json` value cannot be decoded. */
export async function decodeHash(hash: string): Promise<HashTarget | null> {
  const query = new URLSearchParams(hash.replace(/^#/, ''));
  const spec = query.get('spec');
  if (spec) {
    if (!canCompress()) throw new ShareLinkError('noDecompression');
    return { kind: 'spec', json: new TextDecoder().decode(await inflate(fromBase64Url(spec))) };
  }
  const json = query.get('json');
  if (json) return { kind: 'spec', json: new TextDecoder('utf-8', { fatal: true }).decode(fromBase64Url(json)) };
  const id = query.get('example');
  if (id) return { kind: 'example', id };
  const name = query.get('indicator');
  if (name) return { kind: 'indicator', name };
  return null;
}
