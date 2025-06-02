var HtmlWebpackPlugin = require('html-webpack-plugin')
var path = require('path')
const webpack = require('webpack')

module.exports = {
  outputDir: path.resolve(__dirname, '../../resources/mri'),
  lintOnSave: true,
  
  // Define multiple pages/entry points
  pages: {
    // Main application
    index: {
      entry: 'src/main.ts',
      template: 'public/index.html',
      filename: 'index.html',
      title: 'MRI PA UI',
    },
    // Demo page for query filters
    demo: {
      entry: 'src/demo-entry.ts',
      template: 'public/demo.html',
      filename: 'demo.html',
      title: 'Query Filter Demo',
    }
  },
  
  devServer: {
    host: 'localhost',
    port: 8081,
    proxy: {
      '/': {
        target: 'https://localhost:41100',
        ws: false,
      },
    },
    server: 'https'
  },
  
  publicPath: '',
  
  chainWebpack: config => {
    config.resolve.alias.set('vue', '@vue/compat')

    // Configure the main entry point
    config.plugin('html-index').tap(args => {
      if (args[0]) {
        args[0].inject = false
      }
      return args
    })

    config.plugin('copy').tap(args => {
      args[0].patterns[0].globOptions.ignore = ['**/sandbox.js', '**/Component.js', '**/favicon.ico', '**/index.html', '**/demo.html']
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
        stream: require.resolve('stream-browserify'),
        crypto: false,
      },
    },
    plugins: [
      new webpack.ProvidePlugin({
        process: require.resolve('process/browser'),
      }),
      new HtmlWebpackPlugin({
        filename: 'assets.json',
        inject: false,
        chunks: ['index'],
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