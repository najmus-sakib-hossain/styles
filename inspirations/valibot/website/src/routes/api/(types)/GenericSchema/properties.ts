import type { PropertyProps } from '~/components';

export const properties: Record<string, PropertyProps> = {
  TInput: {
    modifier: 'extends',
    type: 'any',
    default: 'unknown',
  },
  TOutput: {
    modifier: 'extends',
    type: 'any',
    default: {
      type: 'custom',
      name: 'TInput',
    },
  },
  TIssue: {
    modifier: 'extends',
    type: {
      type: 'custom',
      name: 'BaseIssue',
      href: '../BaseIssue/',
      generics: ['unknown'],
    },
    default: {
      type: 'custom',
      name: 'BaseIssue',
      generics: ['unknown'],
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
          name: 'TInput',
        },
        {
          type: 'custom',
          name: 'TOutput',
        },
        {
          type: 'custom',
          name: 'TIssue',
        },
      ],
    },
  },
};
