import { supportedDataTypes } from '../../../tests/shared'
import { StandardRPCJsonSerializer } from './rpc-json-serializer'

class Person {
  constructor(
    public name: string,
    public date: Date,
  ) {}

  toJSON() {
    return {
      name: this.name,
      date: this.date,
    }
  }
}

class Person2 {
  constructor(
    public name: string,
    public data: any,
  ) { }

  toJSON() {
    return {
      name: this.name,
      data: this.data,
    }
  }
}

const customSupportedDataTypes: { name: string, value: unknown, expected: unknown }[] = [
  {
    name: 'person - 1',
    value: new Person('unnoq', new Date('2023-01-01')),
    expected: new Person('unnoq', new Date('2023-01-01')),
  },
  {
    name: 'person - 2',
    value: new Person2('unnoq - 2', [{ nested: new Date('2023-01-02') }, /uic/gi]),
    expected: new Person2('unnoq - 2', [{ nested: new Date('2023-01-02') }, /uic/gi]),
  },
  {
    name: 'should not resolve toJSON',
    value: { value: { toJSON: () => 'hello' } },
    expected: { value: { } },
  },
  {
    name: 'should resolve invalid toJSON',
    value: { value: { toJSON: 'hello' } },
    expected: { value: { toJSON: 'hello' } },
  },
]

describe.each([
  ...supportedDataTypes,
  ...customSupportedDataTypes,
])('standardRPCJsonSerializer: $name', ({ value, expected }) => {
  const serializer = new StandardRPCJsonSerializer({
    customJsonSerializers: [
      {
        type: 20,
        condition: data => data instanceof Person,
        serialize: data => data.toJSON(),
        deserialize: data => new Person(data.name, data.date),
      },
      {
        type: 21,
        condition: data => data instanceof Person2,
        serialize: data => data.toJSON(),
        deserialize: data => new Person2(data.name, data.data),
      },
    ],
  })

  function assert(value: unknown, expected: unknown) {
    const [json, meta, maps, blobs] = serializer.serialize(value)

    const result = JSON.parse(JSON.stringify({ json, meta, maps }))

    const deserialized = serializer.deserialize(
      result.json,
      result.meta,
      result.maps,
      (i: number) => blobs[i]!,
    )
    expect(deserialized).toEqual(expected)
  }

  it('flat', () => {
    assert(value, expected)
  })

  it('nested object', () => {
    assert({
      data: value,
      nested: {
        data: value,
      },
    }, {
      data: expected,
      nested: {
        data: expected,
      },
    })
  })

  it('nested array', () => {
    assert([value, [value]], [expected, [expected]])
  })

  it('complex', () => {
    assert({
      'date': new Date('2023-01-01'),
      'regexp': /uic/gi,
      'url': new URL('https://unnoq.com'),
      '!@#$%^^&()[]>?<~_<:"~+!_': value,
      'list': [value],
      'map': new Map([[value, value]]),
      'set': new Set([value]),
      'nested': {
        nested: value,
      },
    }, {
      'date': new Date('2023-01-01'),
      'regexp': /uic/gi,
      'url': new URL('https://unnoq.com'),
      '!@#$%^^&()[]>?<~_<:"~+!_': expected,
      'list': [expected],
      'map': new Map([[expected, expected]]),
      'set': new Set([expected]),
      'nested': {
        nested: expected,
      },
    })
  })
})

describe('standardRPCJsonSerializer: custom serializers', () => {
  it('should throw when type is duplicated', () => {
    expect(() => {
      return new StandardRPCJsonSerializer({
        customJsonSerializers: [
          {
            type: 20,
            condition: data => data instanceof Person,
            serialize: data => data.toJSON(),
            deserialize: data => new Person(data.name, data.date),
          },
          {
            type: 20,
            condition: data => data instanceof Person,
            serialize: data => data.toJSON(),
            deserialize: data => new Person(data.name, data.date),
          },
        ],
      })
    }).toThrow('Custom serializer type must be unique.')
  })
})
