import type { PropertyProps } from '~/components';

export const properties: Record<string, PropertyProps> = {
  TSchema: {
    modifier: 'extends',
    type: {
      type: 'custom',
      name: 'SchemaWithoutPipe',
      href: '../SchemaWithoutPipe/',
      generics: [
        {
          type: 'union',
          options: [
            {
              type: 'custom',
              name: 'LooseObjectSchema',
              href: '../LooseObjectSchema/',
              generics: [
                {
                  type: 'custom',
                  name: 'ObjectEntries',
                  href: '../ObjectEntries/',
                },
                {
                  type: 'union',
                  options: [
                    {
                      type: 'custom',
                      name: 'ErrorMessage',
                      href: '../ErrorMessage/',
                      generics: [
                        {
                          type: 'custom',
                          name: 'LooseObjectIssue',
                          href: '../LooseObjectIssue/',
                        },
                      ],
                    },
                    'undefined',
                  ],
                },
              ],
            },
            {
              type: 'custom',
              name: 'ObjectSchema',
              href: '../ObjectSchema/',
              generics: [
                {
                  type: 'custom',
                  name: 'ObjectEntries',
                  href: '../ObjectEntries/',
                },
                {
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
              ],
            },
            {
              type: 'custom',
              name: 'ObjectWithRestSchema',
              href: '../ObjectWithRestSchema/',
              generics: [
                {
                  type: 'custom',
                  name: 'ObjectEntries',
                  href: '../ObjectEntries/',
                },
                {
                  type: 'custom',
                  name: 'BaseSchema',
                  href: '../BaseSchema/',
                  generics: [
                    'unknown',
                    'unknown',
                    {
                      type: 'custom',
                      name: 'BaseIssue',
                      href: '../BaseIssue/',
                      generics: ['unknown'],
                    },
                  ],
                },
                {
                  type: 'union',
                  options: [
                    {
                      type: 'custom',
                      name: 'ErrorMessage',
                      href: '../ErrorMessage/',
                      generics: [
                        {
                          type: 'custom',
                          name: 'ObjectWithRestIssue',
                          href: '../ObjectWithRestIssue/',
                        },
                      ],
                    },
                    'undefined',
                  ],
                },
              ],
            },
            {
              type: 'custom',
              name: 'StrictObjectSchema',
              href: '../StrictObjectSchema/',
              generics: [
                {
                  type: 'custom',
                  name: 'ObjectEntries',
                  href: '../ObjectEntries/',
                },
                {
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
              ],
            },
          ],
        },
      ],
    },
  },
  TKeys: {
    modifier: 'extends',
    type: {
      type: 'custom',
      name: 'ObjectKeys',
      href: '../ObjectKeys/',
      generics: [
        {
          type: 'custom',
          name: 'TSchema',
        },
      ],
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
              name: 'NonOptionalIssue',
              href: '../NonOptionalIssue/',
            },
          ],
        },
        'undefined',
      ],
    },
  },
  schema: {
    type: {
      type: 'custom',
      name: 'TSchema',
    },
  },
  keys: {
    type: {
      type: 'custom',
      name: 'TKey',
    },
  },
  message: {
    type: {
      type: 'custom',
      name: 'TMessage',
    },
  },
  AllKeysSchema: {
    type: {
      type: 'custom',
      name: 'SchemaWithRequired',
      href: '../SchemaWithRequired/',
      generics: [
        {
          type: 'custom',
          name: 'TSchema',
        },
        'undefined',
        {
          type: 'custom',
          name: 'TMessage',
        },
      ],
    },
  },
  SelectedKeysSchema: {
    type: {
      type: 'custom',
      name: 'SchemaWithRequired',
      href: '../SchemaWithRequired/',
      generics: [
        {
          type: 'custom',
          name: 'TSchema',
        },
        {
          type: 'custom',
          name: 'Tkeys',
        },
        {
          type: 'custom',
          name: 'TMessage',
        },
      ],
    },
  },
};
