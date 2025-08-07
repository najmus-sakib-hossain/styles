import { EMOJI_REGEX } from '../../regex.ts';
import type {
  BaseIssue,
  BaseValidation,
  ErrorMessage,
} from '../../types/index.ts';
import { _addIssue } from '../../utils/index.ts';

/**
 * Emoji issue interface.
 */
export interface EmojiIssue<TInput extends string> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: 'validation';
  /**
   * The issue type.
   */
  readonly type: 'emoji';
  /**
   * The expected property.
   */
  readonly expected: null;
  /**
   * The received property.
   */
  readonly received: `"${string}"`;
  /**
   * The emoji regex.
   */
  readonly requirement: RegExp;
}

/**
 * Emoji action interface.
 */
export interface EmojiAction<
  TInput extends string,
  TMessage extends ErrorMessage<EmojiIssue<TInput>> | undefined,
> extends BaseValidation<TInput, TInput, EmojiIssue<TInput>> {
  /**
   * The action type.
   */
  readonly type: 'emoji';
  /**
   * The action reference.
   */
  readonly reference: typeof emoji;
  /**
   * The expected property.
   */
  readonly expects: null;
  /**
   * The emoji regex.
   */
  readonly requirement: RegExp;
  /**
   * The error message.
   */
  readonly message: TMessage;
}

/**
 * Creates an [emoji](https://en.wikipedia.org/wiki/Emoji) validation action.
 *
 * @returns An emoji action.
 */
export function emoji<TInput extends string>(): EmojiAction<TInput, undefined>;

/**
 * Creates an [emoji](https://en.wikipedia.org/wiki/Emoji) validation action.
 *
 * @param message The error message.
 *
 * @returns An emoji action.
 */
export function emoji<
  TInput extends string,
  const TMessage extends ErrorMessage<EmojiIssue<TInput>> | undefined,
>(message: TMessage): EmojiAction<TInput, TMessage>;

// @__NO_SIDE_EFFECTS__
export function emoji(
  message?: ErrorMessage<EmojiIssue<string>>
): EmojiAction<string, ErrorMessage<EmojiIssue<string>> | undefined> {
  return {
    kind: 'validation',
    type: 'emoji',
    reference: emoji,
    async: false,
    expects: null,
    requirement: EMOJI_REGEX,
    message,
    '~run'(dataset, config) {
      if (dataset.typed && !this.requirement.test(dataset.value)) {
        _addIssue(this, 'emoji', dataset, config);
      }
      return dataset;
    },
  };
}
