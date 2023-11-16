// @ts-ignore
const application = /** @type {import('./application/index.js').Application} */(window.APPLICATION)
const dataset = application.configuration?.datasets?.[0]

// No SSR here so we can use a singleton in the module scope
// export const appInfo = new AppInfo()
export const appInfo = {
  application,
  dataset,
  datasetUrl: dataset?.href,
  labelField: dataset?.schema.find(f => f['x-refersTo'] === 'http://www.w3.org/2000/01/rdf-schema#label'),
  idField: dataset?.schema.find(f => f.key === '_id') ? '_id' : '_i',
  descriptionField: dataset?.schema.find(f => f['x-refersTo'] === 'http://schema.org/description'),
  imageField: dataset?.schema.find(f => f['x-refersTo'] === 'http://schema.org/image') || dataset?.schema.find(f => f['x-refersTo'] === 'http://schema.org/DigitalDocument'),
  attachmentField: dataset?.schema.find(f => f['x-refersTo'] === 'http://schema.org/DigitalDocument'),
  webPageField: dataset?.schema.find(f => f['x-refersTo'] === 'https://schema.org/WebPage'),
  config: application.configuration
}

export default appInfo
