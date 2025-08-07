import { PiniaColada } from '@pinia/colada'
import { mount as baseMount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { orpc as client } from '../../client/tests/shared'
import { createORPCVueColadaUtils } from '../src'

export const orpc = createORPCVueColadaUtils(client)

export const mount: typeof baseMount = (component, options) => {
  return baseMount(component, {
    global: {
      plugins: [
        createPinia(),
        PiniaColada,
      ],
    },
    ...options,
  })
}
