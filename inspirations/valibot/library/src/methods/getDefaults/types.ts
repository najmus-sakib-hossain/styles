import type {
  LooseObjectIssue,
  LooseObjectSchema,
  LooseObjectSchemaAsync,
  LooseTupleIssue,
  LooseTupleSchema,
  LooseTupleSchemaAsync,
  ObjectIssue,
  ObjectSchema,
  ObjectSchemaAsync,
  ObjectWithRestIssue,
  ObjectWithRestSchema,
  ObjectWithRestSchemaAsync,
  StrictObjectIssue,
  StrictObjectSchema,
  StrictObjectSchemaAsync,
  StrictTupleIssue,
  StrictTupleSchema,
  StrictTupleSchemaAsync,
  TupleIssue,
  TupleSchema,
  TupleSchemaAsync,
  TupleWithRestIssue,
  TupleWithRestSchema,
  TupleWithRestSchemaAsync,
} from '../../schemas/index.ts';
import type {
  BaseIssue,
  BaseSchema,
  BaseSchemaAsync,
  ErrorMessage,
} from '../../types/index.ts';
import type { InferDefault } from '../getDefault/index.ts';

/**
 * Infer defaults type.
 */
export type InferDefaults<
  TSchema extends
    | BaseSchema<unknown, unknown, BaseIssue<unknown>>
    | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>,
> = TSchema extends
  | LooseObjectSchema<
      infer TEntries,
      ErrorMessage<LooseObjectIssue> | undefined
    >
  | ObjectSchema<infer TEntries, ErrorMessage<ObjectIssue> | undefined>
  | ObjectWithRestSchema<
      infer TEntries,
      BaseSchema<unknown, unknown, BaseIssue<unknown>>,
      ErrorMessage<ObjectWithRestIssue> | undefined
    >
  | StrictObjectSchema<
      infer TEntries,
      ErrorMessage<StrictObjectIssue> | undefined
    >
  ? { -readonly [TKey in keyof TEntries]: InferDefaults<TEntries[TKey]> }
  : TSchema extends
        | LooseObjectSchemaAsync<
            infer TEntries,
            ErrorMessage<LooseObjectIssue> | undefined
          >
        | ObjectSchemaAsync<
            infer TEntries,
            ErrorMessage<ObjectIssue> | undefined
          >
        | ObjectWithRestSchemaAsync<
            infer TEntries,
            BaseSchema<unknown, unknown, BaseIssue<unknown>>,
            ErrorMessage<ObjectWithRestIssue> | undefined
          >
        | StrictObjectSchemaAsync<
            infer TEntries,
            ErrorMessage<StrictObjectIssue> | undefined
          >
    ? { -readonly [TKey in keyof TEntries]: InferDefaults<TEntries[TKey]> }
    : TSchema extends
          | LooseTupleSchema<
              infer TItems,
              ErrorMessage<LooseTupleIssue> | undefined
            >
          | StrictTupleSchema<
              infer TItems,
              ErrorMessage<StrictTupleIssue> | undefined
            >
          | TupleSchema<infer TItems, ErrorMessage<TupleIssue> | undefined>
          | TupleWithRestSchema<
              infer TItems,
              BaseSchema<unknown, unknown, BaseIssue<unknown>>,
              ErrorMessage<TupleWithRestIssue> | undefined
            >
      ? { -readonly [TKey in keyof TItems]: InferDefaults<TItems[TKey]> }
      : TSchema extends
            | LooseTupleSchemaAsync<
                infer TItems,
                ErrorMessage<LooseTupleIssue> | undefined
              >
            | StrictTupleSchemaAsync<
                infer TItems,
                ErrorMessage<StrictTupleIssue> | undefined
              >
            | TupleSchemaAsync<
                infer TItems,
                ErrorMessage<TupleIssue> | undefined
              >
            | TupleWithRestSchemaAsync<
                infer TItems,
                BaseSchema<unknown, unknown, BaseIssue<unknown>>,
                ErrorMessage<TupleWithRestIssue> | undefined
              >
        ? { -readonly [TKey in keyof TItems]: InferDefaults<TItems[TKey]> }
        : Awaited<InferDefault<TSchema>>;
