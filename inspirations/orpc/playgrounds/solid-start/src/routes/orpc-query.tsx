import { useInfiniteQuery } from '@tanstack/solid-query'
import { For } from 'solid-js'
import { orpc } from '~/lib/orpc'

export function ListPlanetsQuery() {
  const query = useInfiniteQuery(
    () => orpc.planet.list.infiniteOptions({
      input: cursor => ({ cursor, limit: 10 }),
      getNextPageParam: lastPage => lastPage.length === 10 ? lastPage.at(-1)?.id : null,
      initialPageParam: 0,
    }),
  )

  return (
    <div>
      <h2>oRPC and Tanstack Query | List Planets example</h2>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Description</th>
            <th>Image</th>
          </tr>
        </thead>
        <tbody>
          <For each={query.data?.pages}>
            {page => (
              <For each={page}>
                {planet => (
                  <tr>
                    <td>{planet.id}</td>
                    <td>{planet.name}</td>
                    <td>{planet.description}</td>
                    <td>{planet.imageUrl}</td>
                  </tr>
                )}
              </For>
            )}
          </For>
        </tbody>

        <tfoot>
          <tr>
            <td colSpan={4}>
              <button
                type="button"
                onClick={() => query.fetchNextPage()}
                disabled={!query.hasNextPage}
              >
                Load more
              </button>

              <button type="button" onClick={() => query.refetch()}>
                Refresh
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
