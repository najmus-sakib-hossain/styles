import { CreatePlanetMutationForm } from './components/orpc-mutation'
import { ListPlanetsQuery } from './components/orpc-query'

export default function App() {
  return (
    <div>
      <h1>ORPC Playground</h1>
      <hr />
      <CreatePlanetMutationForm />
      <hr />
      <ListPlanetsQuery />
    </div>
  )
}
