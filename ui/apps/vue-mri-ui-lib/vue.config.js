var HtmlWebpackPlugin = require('html-webpack-plugin')
var path = require('path')
const webpack = require('webpack')

module.exports = {
  outputDir: path.resolve(__dirname, '../../resources/mri'),
  lintOnSave: true,
  devServer: {
    host: 'localhost',
    port: 8081,

    // add your proxies here. See https://cli.vuejs.org/config/#devserver-proxy
    proxy: {
      '/': {
        target: 'https://localhost:41100',
        ws: false, // This disables proxying of ws so the hot reloader can communicate directly with vue dev server
      },
    },
    server: 'https'
  },
  publicPath: '',
  chainWebpack: config => {
    config.resolve.alias.set('vue', '@vue/compat')

    config.plugin('html').tap(args => {
      args[0].template = './public/index.html'
      args[0].filename = 'index.html'
      args[0].inject = false
      return args
    })

    config.plugin('copy').tap(args => {
      args[0].patterns[0].globOptions.ignore = ['**/sandbox.js', '**/Component.js', '**/favicon.ico', '**/index.html']
      return args
    })

    config.module
      .rule('vue')
      .use('vue-loader')
      .tap(options => {
        return {
          ...options,
          compilerOptions: {
            compatConfig: {
              MODE: 2,
            },
          },
        }
      })
  },
  configureWebpack: {
    resolve: {
      preferRelative: true,
      fallback: {
        // https://stackoverflow.com/questions/64557638/how-to-polyfill-node-core-modules-in-webpack-5
        stream: require.resolve('stream-browserify'),
        crypto: false,
      },
    },
    plugins: [
      // vue 3 uses vue-cli 5 that uses Webpack 5. In webpack 5 automatic node.js polyfills are removed, so we need to install the browser versions and alias
      // https://stackoverflow.com/questions/65018431/webpack-5-uncaught-referenceerror-process-is-not-defined/65018686#65018686
      new webpack.ProvidePlugin({
        process: require.resolve('process/browser'),
      }),
      new HtmlWebpackPlugin({
        filename: 'assets.json',
        inject: false,
        templateContent: ({ htmlWebpackPlugin }) => {
          const prependBasePath = filepath => `${process.env.VUE_APP_HOST}/mri/${filepath}`
          return JSON.stringify({
            js: htmlWebpackPlugin.files.js.map(prependBasePath),
            css: htmlWebpackPlugin.files.css.map(prependBasePath),
          })
        },
      }),
    ],
    devtool: 'source-map',
  },
}
