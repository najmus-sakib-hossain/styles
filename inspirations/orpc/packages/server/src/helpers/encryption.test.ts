import { decrypt, encrypt } from './encryption'

describe('encrypt/decrypt', () => {
  const secret = 'test-secret-key'
  const message = 'Hello, World!'

  it('should encrypt and decrypt successfully', async () => {
    const encrypted = await encrypt(message, secret)
    const decrypted = await decrypt(encrypted, secret)

    expect(decrypted).toBe(message)
  })

  it('should produce base64url encoded output', async () => {
    const encrypted = await encrypt(message, secret)

    // Should not contain base64 special characters
    expect(encrypted).not.toMatch(/[+/=]/)
    // Should only contain base64url safe characters
    expect(encrypted).toMatch(/^[\w-]+$/)
  })

  it('should produce different encrypted values each time', async () => {
    const encrypted1 = await encrypt(message, secret)
    const encrypted2 = await encrypt(message, secret)

    expect(encrypted1).not.toBe(encrypted2)

    // But both should decrypt to the same message
    const decrypted1 = await decrypt(encrypted1, secret)
    const decrypted2 = await decrypt(encrypted2, secret)

    expect(decrypted1).toBe(message)
    expect(decrypted2).toBe(message)
  })

  it('should return undefined for wrong secret', async () => {
    const encrypted = await encrypt(message, secret)
    const decrypted = await decrypt(encrypted, 'wrong-secret')

    expect(decrypted).toBeUndefined()
  })

  it('should return undefined for corrupted data', async () => {
    const encrypted = await encrypt(message, secret)
    const corrupted = `${encrypted.slice(0, -5)}XXXXX`
    const decrypted = await decrypt(corrupted, secret)

    expect(decrypted).toBeUndefined()
  })

  it('should handle Unicode characters', async () => {
    const unicodeMessage = '你好世界 🌍 Здравствуй мир 🚀'
    const encrypted = await encrypt(unicodeMessage, secret)
    const decrypted = await decrypt(encrypted, secret)

    expect(decrypted).toBe(unicodeMessage)
  })

  it('should handle empty string', async () => {
    const empty = ''
    const encrypted = await encrypt(empty, secret)
    const decrypted = await decrypt(encrypted, secret)

    expect(decrypted).toBe(empty)
  })

  it('should return undefined if encrypted=null/undefined', async () => {
    expect(await decrypt(undefined, 'secret')).toBeUndefined()
    expect(await decrypt(null, 'secret')).toBeUndefined()
  })
})
