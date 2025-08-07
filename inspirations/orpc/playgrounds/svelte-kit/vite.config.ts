import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    // Tell Vite not to externalize this package, so it will be processed by Vite.
    noExternal: [/^@orpc\/.+/],
  },
})
