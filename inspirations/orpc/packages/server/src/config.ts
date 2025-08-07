export interface Config {
  initialInputValidationIndex: number
  initialOutputValidationIndex: number
  dedupeLeadingMiddlewares: boolean
}

const DEFAULT_CONFIG: Config = {
  initialInputValidationIndex: 0,
  initialOutputValidationIndex: 0,
  dedupeLeadingMiddlewares: true,
}

export function fallbackConfig<T extends keyof Config>(key: T, value?: Config[T]): Config[T] {
  if (value === undefined) {
    return DEFAULT_CONFIG[key]
  }

  return value
}
