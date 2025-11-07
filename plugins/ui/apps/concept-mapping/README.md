# Concept Mapping
## Development setup
- `yarn` to install dependencies
- `yarn build` to build and copy to resources folder, which later will be served via dataflow UI in concept mapping node
- Add volume mapping at docker-compose-local.yml for concept-mapping:
  - ./ui/resources/concept-mapping:/usr/src/data/plugins/node_modules/@data2evidence/d2e-ui/resources/concept-mapping

## CSV Upload
- Sample CSV's can be found in `sampleCSV` folder
