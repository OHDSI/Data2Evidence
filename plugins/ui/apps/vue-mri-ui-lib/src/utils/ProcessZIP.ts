import { saveAs } from 'file-saver'
import JSZip from 'jszip'

export default (zipData: JSZip) => {
  const fileName = `PatientAnalytics_Patient-List_${new Date().toISOString()}.zip`
  return zipData.generateAsync({ type: 'blob' }).then(blob => {
    saveAs(blob, fileName)
  })
}
