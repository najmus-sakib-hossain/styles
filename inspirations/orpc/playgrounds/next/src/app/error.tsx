'use client'

export default function ErrorPage({ error }: { error: Error }) {
  return (
    <div>
      <h2>
        Error:
        {error.message}
      </h2>
    </div>
  )
}
