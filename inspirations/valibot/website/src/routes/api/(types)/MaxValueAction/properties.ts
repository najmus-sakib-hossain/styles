import type { PropertyProps } from '~/components';

export const properties: Record<string, PropertyProps> = {
  TInput: {
    modifier: 'extends',
    type: {
      type: 'custom',
      name: 'ValueInput',
      href: '../ValueInput/',
    },
  },
  TRequirement: {
    modifier: 'extends',
    type: {
      type: 'custom',
      name: 'TInput',
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
              name: 'MaxValueIssue',
              href: '../MaxValueIssue/',
              generics: [
                {
                  type: 'custom',
                  name: 'TInput',
                },
                {
                  type: 'custom',
                  name: 'TRequirement',
                },
              ],
            },
          ],
        },
        'undefined',
      ],
    },
  },
  BaseValidation: {
    modifier: 'extends',
    type: {
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
          name: 'TInput',
        },
        {
          type: 'custom',
          name: 'MaxValueIssue',
          href: '../MaxValueIssue/',
          generics: [
            {
              type: 'custom',
              name: 'TInput',
            },
            {
              type: 'custom',
              name: 'TRequirement',
            },
          ],
        },
      ],
    },
  },
  type: {
    type: {
      type: 'string',
      value: 'max_value',
    },
  },
  reference: {
    type: {
      type: 'custom',
      modifier: 'typeof',
      name: 'maxValue',
      href: '../maxValue/',
    },
  },
  expects: {
    type: {
      type: 'template',
      parts: [
        {
          type: 'string',
          value: '<=',
        },
        'string',
      ],
    },
  },
  requirement: {
    type: {
      type: 'custom',
      name: 'TRequirement',
    },
  },
  message: {
    type: {
      type: 'custom',
      name: 'TMessage',
    },
  },
};
