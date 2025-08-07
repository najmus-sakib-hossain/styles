import type { BaseTransformation } from '../../types/index.ts';
import type { ValueInput } from '../types.ts';

/**
 * To max value action interface.
 */
export interface ToMaxValueAction<
  TInput extends ValueInput,
  TRequirement extends TInput,
> extends BaseTransformation<TInput, TInput, never> {
  /**
   * The action type.
   */
  readonly type: 'to_max_value';
  /**
   * The action reference.
   */
  readonly reference: typeof toMaxValue;
  /**
   * The maximum value.
   */
  readonly requirement: TRequirement;
}

/**
 * Creates a to max value transformation action.
 *
 * @param requirement The maximum value.
 *
 * @returns A to max value action.
 */
// @__NO_SIDE_EFFECTS__
export function toMaxValue<
  TInput extends ValueInput,
  const TRequirement extends TInput,
>(requirement: TRequirement): ToMaxValueAction<TInput, TRequirement> {
  return {
    kind: 'transformation',
    type: 'to_max_value',
    reference: toMaxValue,
    async: false,
    requirement,
    '~run'(dataset) {
      dataset.value =
        dataset.value > this.requirement ? this.requirement : dataset.value;
      return dataset;
    },
  };
}
