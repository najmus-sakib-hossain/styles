import type { PropertyProps } from '~/components';

export const properties: Record<string, PropertyProps> = {
  TEntries: {
    modifier: 'extends',
    type: {
      type: 'custom',
      name: 'ObjectEntries',
      href: '../ObjectEntries/',
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
              name: 'ObjectIssue',
              href: '../ObjectIssue/',
            },
          ],
        },
        'undefined',
      ],
    },
  },
  BaseSchema: {
    modifier: 'extends',
    type: {
      type: 'custom',
      name: 'BaseSchema',
      href: '../BaseSchema/',
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
              name: 'ObjectIssue',
              href: '../ObjectIssue/',
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
      value: 'object',
    },
  },
  reference: {
    type: {
      type: 'custom',
      modifier: 'typeof',
      name: 'object',
      href: '../object/',
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
