import QueryString from '../QueryString'

describe('QueryString.ts', () => {
  it('generates uncompressed url querystring', () => {
    const result = QueryString({
      url: 'http://localhost:3000',
      queryString: {
        var1: 'val1',
        var2: [1, 2],
      },
      compress: [],
    })
    expect(decodeURIComponent(result)).toEqual('http://localhost:3000?var1=val1&var2=1,2')
  })

  it('generates compressed url querystring', () => {
    const result = QueryString({
      url: 'http://localhost:3000',
      queryString: {
        var1: JSON.stringify({ name: 'groot', address: 'singapore' }),
      },
      compress: ['var1'],
    })
    expect(decodeURIComponent(result)).toEqual(
      'http://localhost:3000?var1=eJyrVspLzE1VslJKL8rPL1HSUUpMSSlKLS4GihRn5qUnFuQXpSrVAgD42A0j'
    )
  })
})
