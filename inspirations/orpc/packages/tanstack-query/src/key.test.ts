import { generateOperationKey } from './key'

it('generateOperationKey', () => {
  expect(generateOperationKey(['path'])).toEqual([['path'], {}])
  expect(generateOperationKey(['planet', 'create'], { type: 'mutation' }))
    .toEqual([['planet', 'create'], { type: 'mutation' }])
  expect(generateOperationKey(['planet', 'find'], { type: 'query', input: { id: 1 } }))
    .toEqual([['planet', 'find'], { type: 'query', input: { id: 1 } }])
  expect(generateOperationKey(['planet', 'stream'], { type: 'streamed', input: { cursor: 0 }, fnOptions: { refetchMode: 'append' } }))
    .toEqual([['planet', 'stream'], { type: 'streamed', input: { cursor: 0 }, fnOptions: { refetchMode: 'append' } }])
})
