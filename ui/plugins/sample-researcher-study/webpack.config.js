const path = require('path')
const fs = require('fs')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const HtmlWebPackPlugin = require('html-webpack-plugin')

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production'
  const isBuild = env.build

  const entryFile = isBuild ? 'module.ts' : 'index.tsx'
  const externals = isBuild ? ['react'] : []

  return {
    mode: argv.mode,
    devtool: isProduction ? false : 'source-map',
    devServer: {
      https: {
        key: fs.readFileSync(path.resolve(__dirname, "../../.cert/local_alp_portal_private.key")),
        cert: fs.readFileSync(path.resolve(__dirname, "../../.cert/local_alp_portal_public.crt")),
      },
      port: 4900,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
      }
    },
    entry: {
      module: path.join(__dirname, 'src', entryFile)
    },
    output: {
      path: isProduction ? path.resolve(__dirname, '../../resources/sample-researcher-study') : path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      libraryTarget: 'umd',
      umdNamedDefine: true,
      globalObject: 'this',
    },
    externals,
    target: 'web',
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      alias: {
        '~': path.resolve(__dirname, 'src')
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: '/node_modules/',
          use: 'ts-loader'
        },
        {
          test: /\.(css|scss)$/,
          use: ['style-loader', 'css-loader', 'sass-loader'],
        },
      ]
    },
    optimization: {
      minimize: isProduction,
      minimizer: [new TerserPlugin()]
    },
    plugins: [
      new CleanWebpackPlugin(),
      new HtmlWebPackPlugin({
        template: path.resolve(__dirname, 'src/index.html'),
        filename: 'index.html'
      })
    ]
  }
}
