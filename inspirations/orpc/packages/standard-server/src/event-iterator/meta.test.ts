import { getEventMeta, withEventMeta } from './meta'

it('get/withEventMeta', () => {
  const data = { value: 123, meta: undefined }
  const applied = withEventMeta(data, { id: '123', retry: 10000, comments: ['hello', 'world'] })
  expect(applied).toEqual(data)
  expect(applied).not.toBe(data)
  expect(getEventMeta(applied)).toEqual({ id: '123', retry: 10000, comments: ['hello', 'world'] })
  expect(getEventMeta(data)).toEqual(undefined)
  expect(getEventMeta(1)).toEqual(undefined)

  expect(() => withEventMeta(data, { id: '123\n' })).toThrow('Event\'s id must not contain a newline character')
  expect(() => withEventMeta(data, { retry: Number.NaN })).toThrow('Event\'s retry must be a integer and >= 0')
  expect(() => withEventMeta(data, { retry: 1.1 })).toThrow('Event\'s retry must be a integer and >= 0')
  expect(() => withEventMeta(data, { retry: -1 })).toThrow('Event\'s retry must be a integer and >= 0')
  expect(() => withEventMeta(data, { comments: ['hi\n'] })).toThrow('Event\'s comment must not contain a newline character')
})
