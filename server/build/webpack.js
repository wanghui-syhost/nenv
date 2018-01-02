const { resolve, join, sep } = require('path')
const { realpathSync, existsSync } = require('fs')
const webpack = require('webpack')
const glob = require('glob-promise')
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin')
const HtmlWebpckPlugin = require('html-webpack-plugin')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

const CombineAssetsPlugin = require('./plugins/combine-assets-plugin')
const getConfig = require('../config')

const defaultPages = [

]

const nenvPagesDir = join(__dirname, '..', '..', 'pages')
const nenvNodeModulesDir = join(__dirname, '..', '..', '..', 'node_modules')
const interpolateNames = new Map(defaultPages.map((p) => {
  return [join(nenvPagesDir, p), `dist/pages/${p}`]
}))

module.exports = async function createCompiler (dir, { dev = false, quiet = false, buildDir, conf = null } = {}) {
  dir = realpathSync(resolve(dir))
  const config = getConfig(dir, conf)
  const defaultEntries = dev ? [
    join(__dirname, '..', '..', 'client', 'webpack-hot-middleware-client')
  ] : []
  const mainJS = dev
        ? require.resolve('../../client/nenv-dev') : require.resolve('../../client/nenv')

  let totalPages

  const entry = async () => {
    const entries = {
      'main.js': [
        ...defaultEntries,
        ...config.clientBootstrap || [],
        //mainJS
      ]
    }

    const pages = await glob(config.pagesGlobPattern, { cwd: dir })
    // const
    for (const p of defaultPages) {
      const entryName = join('bundles', 'pages', p)
      if (!entries[entryName]) {
        entries[entryName] = [join(nenvPagesDir, p)]
      }
    }
    console.log(entries)
    return entries
  }

  const plugins = [
    new webpack.IgnorePlugin(/(precomputed)/, /node_modules.+(elliptic)/),
    new webpack.LoaderOptionsPlugin({
      options: {
        context: dir

      }
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'manifest',
      filename: 'manifest.js'
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production')
    })
        // new Dy
  ]

  if (dev) {
    plugins.push(
            new webpack.HotModuleReplacementPlugin(),
            new webpack.NoEmitOnErrorsPlugin(),
            new HtmlWebpckPlugin({
              filename: 'index.html',
              template: 'index.html',
              inject: true
            })
    )
    if (!quiet) {
      plugins.push(new FriendlyErrorsWebpackPlugin())
    }
    // plugins.push(
    //   HtmlWebpckPlugin
    // )
  } else {
    plugins.push(new webpack.IgnorePlugin())
    plugins.push(
            new CombineAssetsPlugin({
              input: ['manifest.js', 'commons.js', 'main.js'],
              output: 'app.js'
            }),
            new UglifyJSPlugin({
              parallel: true,
              sourceMap: false,
              uglifyOptions: {
                compress: {
                  comparisons: false
                }
              }
            })
        )
    plugins.push(new webpack.optimize.ModuleConcatenationPlugin())
  }

  const nodePathList = (process.env.NODE_PATH || '')
        .split(process.platform === 'win32' ? ';' : '')
        .filter((p) => !!p)

  const rules = (dev ? [{

  }] : [])
    .concat([
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {}
      },
      {
        test: /\.js$/,
        loader: 'babel-loader'
            // include:
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000
                // name
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)/,
        loader: 'url-loader',
        options: {
          limit: 10000
                // name
        }
      }
    ])

  let webpackConfig = {
    context: dir,
    entry,
    output: {
      path: buildDir ? join(buildDir, '.nenv') : join(dir, config.distDir),
      filename: '[name]',
      libraryTarget: 'commonjs2',
      // publicPath:
      strictModuleExceptionHandling: true,
      chunkFilename: '[name]'
    },
    resolve: {
      extensions: ['.js', '.vue', '.json'],
      alias: {
        'vue$': 'vue/dist/vue.esm.js  '
      },
      modules: [
        nenvNodeModulesDir,
        'node_modules',
        ...nodePathList
      ]
    },
    resolveLoader: {
      modules: [
        nenvNodeModulesDir,
        'node_modules',
        join(__dirname, 'loaders'),
        ...nodePathList
      ]
    },
    plugins,
    module: {
      rules
    },
    devtool: dev ? 'cheap-module-inline-source-map' : false,
    performance: { hints: false }
  }

  if (config.webpack) {
    console.log(`> Using "webpack" config function defined in ${config.configOrigin}.`)
    webpackConfig = await config.webpack(webpackConfig, { dev })
  }
  return webpack(webpackConfig)
}
