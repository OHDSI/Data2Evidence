const pkg = require('./package.json')
const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production'

  return {
    mode: argv.mode,
    ...(isProduction ? {} : { devtool: 'source-map' }),
    entry: {
      index: path.join(__dirname, 'src', 'index.ts')
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      chunkFilename: '[name].bundle.js',
      library: pkg.name,
      libraryTarget: 'umd',
      umdNamedDefine: true,
      globalObject: 'this'
    },
    externals: ['react', 'react-dom'],
    target: 'web',
    resolve: {
      extensions: ['.ts', '.tsx', '.js']
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: 'ts-loader'
        }
      ]
    },
    optimization: {
      minimize: isProduction,
      minimizer: [new TerserPlugin()]
    },
    plugins: [
      new CleanWebpackPlugin(),
      // new BundleAnalyzerPlugin(),
    ]
  }
}
