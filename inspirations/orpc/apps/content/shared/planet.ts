import * as z from 'zod'
import { oc } from '@orpc/contract'
import type { RouterClient } from '@orpc/server'
import { implement } from '@orpc/server'
import type { IncomingHttpHeaders } from 'node:http'

export const PlanetSchema = z.object({
  id: z.number().int().min(1),
  name: z.string(),
  description: z.string().optional(),
})

export const listPlanetContract = oc
  .route({
    method: 'GET',
    path: '/planets',
    summary: 'List all planets',
  })
  .input(
    z.object({
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.number().int().min(0).default(0),
    }),
  )
  .output(z.array(PlanetSchema))

export const findPlanetContract = oc
  .route({
    method: 'GET',
    path: '/planets/{id}',
    summary: 'Find a planet',
  })
  .input(PlanetSchema.pick({ id: true }))
  .output(PlanetSchema)

export const createPlanetContract = oc
  .route({
    method: 'POST',
    path: '/planets',
    summary: 'Create a planet',
  })
  .input(PlanetSchema.omit({ id: true }))
  .output(PlanetSchema)

export const contract = {
  planet: { list: listPlanetContract, find: findPlanetContract, create: createPlanetContract },
}

const os = implement(contract).$context<{ headers?: IncomingHttpHeaders }>()

export const listPlanet = os.planet.list
  .handler(({ input }) => {
    return []
  })

export const findPlanet = os.planet.find
  .handler(({ input }) => {
    return { id: 123, name: 'name' }
  })

export const createPlanet = os.planet.create
  .handler(({ input }) => {
    return { id: 123, name: 'name' }
  })

export const router = os.router({ planet: { list: listPlanet, find: findPlanet, create: createPlanet } })

export const orpc = {} as RouterClient<typeof router>
