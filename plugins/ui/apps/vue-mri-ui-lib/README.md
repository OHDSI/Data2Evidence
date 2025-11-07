# mri-vue

> A Vue.js project

## Requirements

- Node v14
- npm v5++ / yarn 1.9.4

## Project setup

```
yarn
```

### Compiles and hot-reloads for development

```
yarn serve
```

### Compiles and minifies for production (files are copied over to MRI)

```
// commit built files after this step
yarn build
```

### Lints and fixes files

```
yarn lint
```

### Run your unit tests

```
yarn test:unit
```

## Theme Development

- To switch to sap_bluecrystal, run this in the browser control

```
setTheme(1)
```

- To switch to sap_hcb, run this in the browser control

```
setTheme()
```

## Testing Language

- To switch language, run this in the browser console. Then go back to fiori launchpad, then click the app from the launchpad

```
sap.ui.getCore().getConfiguration().setLanguage("de");
```

For detailed explanation on how things work, checkout the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).
