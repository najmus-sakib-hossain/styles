/**
 * Converts Request/Response/Blob/File/.. to a buffer (ArrayBuffer or Uint8Array).
 *
 * Prefers the newer `.bytes` method when available as it more efficient but not widely supported yet.
 */
export function readAsBuffer(source: Pick<Blob, 'arrayBuffer' | 'bytes'>): Promise<ArrayBuffer | Uint8Array> {
  if (typeof source.bytes === 'function') {
    // eslint-disable-next-line ban/ban
    return source.bytes()
  }

  return (source as Pick<Blob, 'arrayBuffer'>).arrayBuffer()
}
