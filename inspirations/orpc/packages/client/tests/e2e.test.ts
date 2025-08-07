import { ORPCError } from '@orpc/contract'
import { safe } from '../src'
import { orpc } from './helpers'

describe('e2e', () => {
  it('on success', () => {
    expect(
      orpc.post.find({ id: '1' }),
    ).resolves.toEqual({ id: '1', title: 'title-1' })

    expect(
      orpc.post.create({ title: 'new-title', thumbnail: new File(['hello'], 'hello.txt') }),
    ).resolves.toEqual({ id: 'id-new-title', title: 'new-title', thumbnail: 'hello.txt' })
  })

  it('on error', async () => {
    const [error,, isDefined] = await safe(orpc.post.find({ id: 'NOT_FOUND' }))

    expect(isDefined).toBe(true)
    expect(error).toBeInstanceOf(ORPCError)
    expect((error as any).data).toEqual({ id: 'NOT_FOUND' })

    const [error2,, isDefined2] = await safe(orpc.post.create({ title: 'CONFLICT' }))

    expect(isDefined2).toBe(true)
    expect(error2).toBeInstanceOf(ORPCError)
    expect((error2 as any).data).toEqual({ title: 'CONFLICT' })

    // @ts-expect-error - invalid input
    const [error3,, isDefined3] = await safe(orpc.post.create({ }))

    expect(isDefined3).toBe(false)
    expect(error3).toBeInstanceOf(ORPCError)
    expect((error3 as any).code).toEqual('BAD_REQUEST')
    expect((error3 as any).data).toEqual({
      issues: [expect.objectContaining({
        message: expect.any(String),
        path: ['title'],
      })],
    })
  })

  it('with client context', async () => {
    expect(
      orpc.post.find({ id: '1' }, { context: { cache: 'force' } }),
    ).rejects.toThrow('cache=force is not supported')
  })
})
