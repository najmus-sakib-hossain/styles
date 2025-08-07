import type { PropertyProps } from '~/components';

export const properties: Record<string, PropertyProps> = {
  TEntries: {
    modifier: 'extends',
    type: {
      type: 'custom',
      name: 'ObjectEntriesAsync',
      href: '../ObjectEntriesAsync/',
    },
  },
  TMessage: {
    modifier: 'extends',
    type: {
      type: 'union',
      options: [
        {
          type: 'custom',
          name: 'ErrorMessage',
          href: '../ErrorMessage/',
          generics: [
            {
              type: 'custom',
              name: 'StrictObjectIssue',
              href: '../StrictObjectIssue/',
            },
          ],
        },
        'undefined',
      ],
    },
  },
  BaseSchemaAsync: {
    modifier: 'extends',
    type: {
      type: 'custom',
      name: 'BaseSchemaAsync',
      href: '../BaseSchemaAsync/',
      generics: [
        {
          type: 'custom',
          name: 'InferObjectInput',
          href: '../InferObjectInput/',
          generics: [
            {
              type: 'custom',
              name: 'TEntries',
            },
          ],
        },
        {
          type: 'custom',
          name: 'InferObjectOutput',
          href: '../InferObjectOutput/',
          generics: [
            {
              type: 'custom',
              name: 'TEntries',
            },
          ],
        },
        {
          type: 'union',
          options: [
            {
              type: 'custom',
              name: 'StrictObjectIssue',
              href: '../StrictObjectIssue/',
            },
            {
              type: 'custom',
              name: 'InferObjectIssue',
              href: '../InferObjectIssue/',
              generics: [
                {
                  type: 'custom',
                  name: 'TEntries',
                },
              ],
            },
          ],
        },
      ],
    },
  },
  type: {
    type: {
      type: 'string',
      value: 'strict_object',
    },
  },
  reference: {
    type: {
      type: 'union',
      options: [
        {
          type: 'custom',
          modifier: 'typeof',
          name: 'strictObject',
          href: '../strictObject/',
        },
        {
          type: 'custom',
          modifier: 'typeof',
          name: 'strictObjectAsync',
          href: '../strictObjectAsync/',
        },
      ],
    },
  },
  expects: {
    type: {
      type: 'string',
      value: 'Object',
    },
  },
  entries: {
    type: {
      type: 'custom',
      name: 'TEntries',
    },
  },
  message: {
    type: {
      type: 'custom',
      name: 'TMessage',
    },
  },
};
