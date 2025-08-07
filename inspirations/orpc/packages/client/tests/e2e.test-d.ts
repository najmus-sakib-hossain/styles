import type { ORPCError } from '@orpc/contract'
import { safe } from '../src'
import { orpc } from './helpers'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('e2e', () => {
  it('infer input', () => {
    orpc.post.find({ id: '123' })
    // @ts-expect-error - invalid input
    orpc.post.find({ id: 123 })

    orpc.post.create({ title: 'hello', thumbnail: new File(['hello'], 'hello.txt') })
    // @ts-expect-error - invalid input
    orpc.post.create({ })
  })

  it('infer output', async () => {
    expectTypeOf(await orpc.post.find({ id: '123' })).toEqualTypeOf<{ id: string, title: string, thumbnail?: string }>()
    expectTypeOf(await orpc.post.create({ title: 'hello' })).toEqualTypeOf<{ id: string, title: string, thumbnail?: string }>()
  })

  it('infer errors', async () => {
    const [error] = await safe(orpc.post.find({ id: '123' }))

    expectTypeOf(error).toEqualTypeOf<
      | null
      | Error
      | ORPCError<'NOT_FOUND', { id: string }>
    >()

    const [error2] = await safe(orpc.post.create({ title: 'title' }))

    expectTypeOf(error2).toEqualTypeOf<
      | null
      | Error
      | ORPCError<'CONFLICT', { title: string, thumbnail?: File }>
      | ORPCError<'FORBIDDEN', { title: string, thumbnail?: File }>
    >()
  })

  it('infer client context', async () => {
    orpc.post.find({ id: '123' }, { context: { cache: 'force' } })
    // @ts-expect-error -- invalid context
    orpc.post.find({ id: '123' }, { context: { cache: 123 } })
  })
})
