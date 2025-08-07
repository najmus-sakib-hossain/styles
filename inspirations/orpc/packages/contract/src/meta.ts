export type Meta = Record<string, any>

export function mergeMeta<T extends Meta>(meta1: T, meta2: T): T {
  return { ...meta1, ...meta2 }
}
