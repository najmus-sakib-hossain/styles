export function toBatchAbortSignal(signals: readonly (AbortSignal | undefined)[]): AbortSignal | undefined {
  const realSignals = signals.filter(signal => signal !== undefined)

  if (realSignals.length === 0 || realSignals.length !== signals.length) {
    return undefined
  }

  const controller = new AbortController()

  const abortIfAllInputsAborted = () => {
    if (realSignals.every(signal => signal.aborted)) {
      controller.abort()
    }
  }

  abortIfAllInputsAborted()

  for (const signal of realSignals) {
    signal.addEventListener('abort', () => {
      abortIfAllInputsAborted()
    }, {
      once: true,
      signal: controller.signal,
    })
  }

  return controller.signal
}
