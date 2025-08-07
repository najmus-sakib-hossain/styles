import * as z from 'zod'
import { oc } from '../src'

export const NewPlanetSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
})

export const UpdatePlanetSchema = z.object({
  id: z.number().int().min(1),
  name: z.string(),
  description: z.string().optional(),
})

export const PlanetSchema = z.object({
  id: z.number().int().min(1),
  name: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
})

export const listPlanets = oc
  .input(
    z.object({
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.number().int().min(0).default(0),
    }),
  )
  .output(z.array(PlanetSchema))

export const createPlanet = oc
  .input(NewPlanetSchema)
  .output(PlanetSchema)

export const findPlanet = oc
  .route({
    method: 'GET',
    path: '/{id}',
    summary: 'Find a planet',
  })
  .input(
    z.object({
      id: z.number().int().min(1),
    }),
  )
  .output(PlanetSchema)

export const updatePlanet = oc
  .route({
    method: 'PUT',
    path: '/{id}',
    summary: 'Update a planet',
  })
  .input(UpdatePlanetSchema)
  .output(PlanetSchema)

export const deletePlanet = oc
  .route({
    method: 'DELETE',
    path: '/{id}',
    summary: 'Delete a planet',
    deprecated: true,
  })
  .input(
    z.object({
      id: z.number().int().min(1),
    }),
  )

export const router = oc.tag('Planets').prefix('/planets').router({
  list: listPlanets,
  create: createPlanet,
  find: findPlanet,
  update: updatePlanet,
  delete: deletePlanet,
})
