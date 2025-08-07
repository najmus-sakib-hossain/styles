import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { Suspense } from 'solid-js'

export default function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        experimental_prefetchInRender: true,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <Router
        root={props => (
          <>
            <Suspense fallback={<p>Loading...</p>}>
              {props.children}
            </Suspense>
          </>
        )}
      >
        <FileRoutes />
      </Router>
    </QueryClientProvider>
  )
}
