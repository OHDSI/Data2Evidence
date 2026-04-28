export function postProcessResults(results) {
  const newData = results.data.map(elem => {
    elem.value = String(elem.value)
    elem.text = elem.text && elem.text !== 'NoValue' ? elem.text : ''
    elem.score = elem.score ? elem.score : 1
    return elem
  })

  return newData
}
