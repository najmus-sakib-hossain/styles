import type { PropertyProps } from '~/components';

export const properties: Record<string, PropertyProps> = {
  TInput: {
    modifier: 'extends',
    type: 'any',
  },
  TOutput: {
    modifier: 'extends',
    type: 'any',
  },
  TIssue: {
    modifier: 'extends',
    type: {
      type: 'custom',
      name: 'BaseIssue',
      href: '../BaseIssue/',
      generics: ['unknown'],
    },
  },
  BaseValidationAsync: {
    modifier: 'extends',
    type: {
      type: 'custom',
      name: 'Omit',
      generics: [
        {
          type: 'custom',
          name: 'BaseValidation',
          href: '../BaseValidation/',
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
        {
          type: 'union',
          options: [
            {
              type: 'string',
              value: 'reference',
            },
            {
              type: 'string',
              value: 'async',
            },
            {
              type: 'string',
              value: '~run',
            },
          ],
        },
      ],
    },
  },
  reference: {
    type: {
      type: 'function',
      params: [
        {
          name: 'args',
          spread: true,
          type: {
            type: 'array',
            item: 'any',
          },
        },
      ],
      return: {
        type: 'union',
        options: [
          {
            type: 'custom',
            name: 'BaseValidation',
            href: '../BaseValidation/',
            generics: [
              'any',
              'any',
              {
                type: 'custom',
                name: 'BaseIssue',
                href: '../BaseIssue/',
                generics: ['unknown'],
              },
            ],
          },
          {
            type: 'custom',
            name: 'BaseValidationAsync',
            generics: [
              'any',
              'any',
              {
                type: 'custom',
                name: 'BaseIssue',
                href: '../BaseIssue/',
                generics: ['unknown'],
              },
            ],
          },
        ],
      },
    },
  },
  async: {
    type: {
      type: 'boolean',
      value: true,
    },
  },
  '~run': {
    type: {
      type: 'function',
      params: [
        {
          name: 'dataset',
          type: {
            type: 'custom',
            name: 'OutputDataset',
            href: '../OutputDataset/',
            generics: [
              {
                type: 'custom',
                name: 'TInput',
              },
              {
                type: 'custom',
                name: 'BaseIssue',
                href: '../BaseIssue/',
                generics: ['unknown'],
              },
            ],
          },
        },
        {
          name: 'config',
          type: {
            type: 'custom',
            name: 'Config',
            href: '../Config/',
            generics: [
              {
                type: 'custom',
                name: 'TIssue',
              },
            ],
          },
        },
      ],
      return: {
        type: 'custom',
        name: 'Promise',
        generics: [
          {
            type: 'custom',
            name: 'OutputDataset',
            href: '../OutputDataset/',
            generics: [
              {
                type: 'custom',
                name: 'TOutput',
              },
              {
                type: 'union',
                options: [
                  {
                    type: 'custom',
                    name: 'BaseIssue',
                    href: '../BaseIssue/',
                    generics: ['unknown'],
                  },
                  {
                    type: 'custom',
                    name: 'TIssue',
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  },
};
