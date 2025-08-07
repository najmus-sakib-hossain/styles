import type { RouterClient } from '@orpc/server'
import { oc } from '@orpc/contract'
import { implement, os } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import * as z from 'zod'
import { createORPCClient } from '../src'
import { RPCLink } from '../src/adapters/fetch'

export const PostFindInput = z.object({
  id: z.string(),
})

export const PostFindOutput = z.object({
  id: z.string(),
  title: z.string(),
  thumbnail: z.string().optional(),
})

export const PostListInput = z.object({
  cursor: z.number().default(0),
  keyword: z.string().optional(),
})

export const PostListOutput = z.object({
  items: z.array(PostFindOutput),
  nextCursor: z.number(),
})

export const PostCreateInput = z.object({
  title: z.string(),
  thumbnail: z.file().optional(),
})

export const PostCreateOutput = PostFindOutput

export const contract = oc.router({
  post: {
    find: oc
      .input(PostFindInput)
      .output(PostFindOutput)
      .errors({
        NOT_FOUND: {
          message: 'Post not found',
          data: PostFindInput,
        },
      }),
    list: oc
      .input(PostListInput)
      .output(PostListOutput)
      .errors({
        TOO_MANY_REQUESTS: {
          message: 'Too many requests',
          data: PostListInput,
        },
      }),
    create: oc
      .input(PostCreateInput)
      .output(PostCreateOutput)
      .errors({
        CONFLICT: {
          message: 'Duplicated title',
          data: PostCreateInput,
        },
        FORBIDDEN: {
          message: 'You are not allowed to create post',
          data: PostCreateInput,
        },
      }),
  },
})

export const router = implement(contract).router({
  post: os.lazy(() => Promise.resolve({ // this lazy help tests more real, more complex
    default: {
      find: implement(contract.post.find).handler(async ({ input, errors }) => {
        if (input.id === 'NOT_FOUND') {
          throw errors.NOT_FOUND({
            data: input,
          })
        }

        return {
          id: input.id,
          title: `title-${input.id}`,
        }
      }),
      list: implement(contract.post.list).handler(async ({ input, errors }) => {
        if (input.keyword === 'TOO_MANY_REQUESTS') {
          throw errors.TOO_MANY_REQUESTS({
            data: input,
          })
        }

        return {
          items: [
            {
              id: `id-${input.cursor}`,
              title: `title-${input.cursor}`,
            },
          ],
          nextCursor: input.cursor + 1,
        }
      }),
      create: implement(contract.post.create).handler(async ({ input, errors }) => {
        if (input.title === 'CONFLICT') {
          throw errors.CONFLICT({
            data: input,
          })
        }

        if (input.title === 'FORBIDDEN') {
          throw errors.FORBIDDEN({
            data: input,
          })
        }

        return {
          id: `id-${input.title}`,
          title: input.title,
          thumbnail: input.thumbnail?.name,
        }
      }),
    },
  })),
})

const rpcHandler = new RPCHandler(router)

export type ClientContext = { cache?: string }

const rpcLink = new RPCLink<ClientContext>({
  url: 'http://localhost:3000',
  fetch: async (url, init, { context }) => {
    if (context?.cache) {
      throw new Error(`cache=${context.cache} is not supported`)
    }

    const request = new Request(url, init)

    const { matched, response } = await rpcHandler.handle(request)

    if (!matched) {
      throw new Error('No procedure matched')
    }

    return response
  },
})

export const orpc: RouterClient<typeof router, ClientContext> = createORPCClient(rpcLink)
