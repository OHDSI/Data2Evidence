import StringToBinary from './StringToBinary'

function serialize({ queryString, compress }: { queryString: any; compress: string[] }): string {
  return `?${Object.keys(queryString)
    .reduce((a, key) => {
      a.push(
        `${key}=${encodeURIComponent(compress.indexOf(key) > -1 ? StringToBinary(queryString[key]) : queryString[key])}`
      )
      return a
    }, [])
    .join('&')}`
}
/*
url - url to append the compresssed query parameters
queryString -  key value pair of querystring to append to url
compress - list of query parameters to compress
*/
export default ({ url, queryString, compress = [] }: { url: string; queryString: any; compress: string[] }): string =>
  `${url}${serialize({ queryString, compress })}`
