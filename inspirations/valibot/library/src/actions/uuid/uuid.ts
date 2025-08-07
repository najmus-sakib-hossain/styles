import { UUID_REGEX } from '../../regex.ts';
import type {
  BaseIssue,
  BaseValidation,
  ErrorMessage,
} from '../../types/index.ts';
import { _addIssue } from '../../utils/index.ts';

/**
 * UUID issue interface.
 */
export interface UuidIssue<TInput extends string> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: 'validation';
  /**
   * The issue type.
   */
  readonly type: 'uuid';
  /**
   * The expected property.
   */
  readonly expected: null;
  /**
   * The received property.
   */
  readonly received: `"${string}"`;
  /**
   * The UUID regex.
   */
  readonly requirement: RegExp;
}

/**
 * UUID action interface.
 */
export interface UuidAction<
  TInput extends string,
  TMessage extends ErrorMessage<UuidIssue<TInput>> | undefined,
> extends BaseValidation<TInput, TInput, UuidIssue<TInput>> {
  /**
   * The action type.
   */
  readonly type: 'uuid';
  /**
   * The action reference.
   */
  readonly reference: typeof uuid;
  /**
   * The expected property.
   */
  readonly expects: null;
  /**
   * The UUID regex.
   */
  readonly requirement: RegExp;
  /**
   * The error message.
   */
  readonly message: TMessage;
}

/**
 * Creates an [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier) validation action.
 *
 * @returns An UUID action.
 */
export function uuid<TInput extends string>(): UuidAction<TInput, undefined>;

/**
 * Creates an [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier) validation action.
 *
 * @param message The error message.
 *
 * @returns An UUID action.
 */
export function uuid<
  TInput extends string,
  const TMessage extends ErrorMessage<UuidIssue<TInput>> | undefined,
>(message: TMessage): UuidAction<TInput, TMessage>;

// @__NO_SIDE_EFFECTS__
export function uuid(
  message?: ErrorMessage<UuidIssue<string>>
): UuidAction<string, ErrorMessage<UuidIssue<string>> | undefined> {
  return {
    kind: 'validation',
    type: 'uuid',
    reference: uuid,
    async: false,
    expects: null,
    requirement: UUID_REGEX,
    message,
    '~run'(dataset, config) {
      if (dataset.typed && !this.requirement.test(dataset.value)) {
        _addIssue(this, 'UUID', dataset, config);
      }
      return dataset;
    },
  };
}
