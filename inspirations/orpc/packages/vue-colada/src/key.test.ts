import { buildKey } from './key'

describe('buildKey', () => {
  it('works', () => {
    expect(buildKey(['path'])).toEqual([['path'], {}])
    expect(buildKey(['path', 'path2'], { input: { a: 1 } })).toEqual([['path', 'path2'], { input: { a: 1 } }])
    expect(buildKey(['path'], { input: undefined })).toEqual([['path'], {}])
    expect(buildKey(['path', 'path2'], { type: 'query' })).toEqual([['path', 'path2'], { type: 'query' }])
    expect(buildKey(['path'], { type: undefined })).toEqual([['path'], {}])
    expect(buildKey(['path', 'path2'], { type: 'query', input: { a: 1 } })).toEqual([['path', 'path2'], { type: 'query', input: { a: 1 } }])

    const date = new Date()
    expect(buildKey(['path', 'path2'], { input: { a: date } })).toEqual([['path', 'path2'], { input: { a: date.toISOString() } }])
  })
})
