const { resolve, join, sep } = require('path')
const { realpathSync, existsSync } = require('fs')
const { createHash } = require('crypto')
const webpack = require('webpack')
const glob = require('glob-promise')
const WriteFilePlugin = require('write-file-webpack-plugin')
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin')
const CaseSensitivePathPlugin = require('case-sensitive-paths-webpack-plugin')
const HtmlWebpckPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

const { styleLoaders, assetsPath } = require('./utils')
const vueLoaderOptions = require('./vue-loader.conf')

const PagesPlugin = require('./plugins/pages-plugin')
const CombineAssetsPlugin = require('./plugins/combine-assets-plugin')
const getConfig = require('../config')
const babelCore = require('babel-core')
const findBabelConfig = require('./babel/find-config')
const pkg = require('../../package')

const defaultPages = [

]

const nenvPagesDir = join(__dirname, '..', '..', 'pages')
const nenvNodeModulesDir = join(__dirname, '..', '..', 'node_modules')
const interpolateNames = new Map(defaultPages.map((p) => {
  return [join(nenvPagesDir, p), `dist/pages/${p}`]
}))

module.exports = async function createCompiler (dir, { dev = false, quiet = false, buildDir, conf = null } = {}) {
  dir = realpathSync(resolve(dir))
  const config = getConfig(dir, conf)
  const defaultEntries = dev ? [
    join(__dirname, '..', '..', 'client', 'webpack-hot-middleware-client'),
    join(__dirname, '..', '..', 'client', 'on-demand-entries-client')
  ] : []
  const mainJS = dev
        ? require.resolve('../../client/nenv-dev') : require.resolve('../../client/nenv')

  let totalPages

  const entry = async () => {
    const entries = {
      'main.js': [
        ...defaultEntries,
        ...config.clientBootstrap || [],
        mainJS,
        join(dir, 'entry.js')
      ]
    }

    // 扫描页面
    const pages = await glob(config.pagesGlobPattern, { cwd: dir })
    console.log('globPages', pages, dir)
    const devPages = pages.filter((p) => true)

    if (dev) {
      for (const p of devPages) {
        entries[join('bundles', p.replace(/\.nenv\./g, '.').replace('.vue', '.js')).replace(/\\/g, '/')] = [`./${p}?entry`]
      }
    } else {
      for (const p of pages) {
        entries[join('bundles', p.replace(/\.nenv\./g, '.').replace('.vue', '.js')).replace(/\\/g, '/')] = [`./${p}?entry`]
      }
    }

    totalPages = pages.filter((p) => true).length
    console.log(entries)
    return entries
  }

  const plugins = [
    new webpack.IgnorePlugin(/(precomputed)/, /node_modules.+(elliptic)/),
    new webpack.LoaderOptionsPlugin({
      options: {
        context: dir,
        customInterpolateName (url, name, opts) {
          return interpolateNames.get(this.rosourcePath) || url
        }
      }
    }),
    new WriteFilePlugin({
      exitOnerrors: false,
      log: true,
      useHashIndex: false
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'commons',
      filename: 'commons.js',
      minChunks (module, count) {
        // console.log(module.context)
        if (module.context && module.context.indexOf(`${sep}nenv${sep}`) >= 0) {
          return true
        }
        if (dev) {
          return false
        }

        if (totalPages <= 2) {
          return count >= totalPages
        }

        return count >= totalPages * 0.5
      }
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'manifest',
      filename: 'manifest.js'
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production')
    }),
    new webpack.DefinePlugin({
      'process.env.VERSION': `'${pkg.version}'`
    }),
    new webpack.DefinePlugin({
      'process.env.project': JSON.stringify(config.project)
    }),
    new PagesPlugin(),
    new CaseSensitivePathPlugin()
  ]

  if (dev) {
    plugins.push(
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoEmitOnErrorsPlugin(),
      new HtmlWebpckPlugin({
        title: config.project.title,
        filename: 'index.html',
        template: join(__dirname, '../../client', 'app.ejs'), // 'index.html',
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
    plugins.push(new HtmlWebpckPlugin({
      title: config.project.title,
      filename: 'index.html',
      template: join(__dirname, '../../client', 'app.ejs'),
      // template: join(__dirname, 'clent') ,//'index.html',
      inject: true,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true
      },
      chunksSortMode: 'dependency'
    }))
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
    plugins.push(new CopyWebpackPlugin([
      {
        from: resolve(dir, 'static'),
        to: buildDir,
        ignore: ['.*']
      }
    ]))
  }

  const nodePathList = (process.env.NODE_PATH || '')
        .split(process.platform === 'win32' ? ';' : '')
        .filter((p) => !!p)

  const mainBabelOptions = {
    cacheDirectory: true,
    presets: []
  }

  const externalBabelConfig = findBabelConfig(dir)
  if (externalBabelConfig) {
    console.log(`> Using external babel configuration`)
    console.log(`> Location: ${externalBabelConfig.loc}`)

    const { options } = externalBabelConfig
    mainBabelOptions.babelrc = options.babelrc !== false
  } else {
    mainBabelOptions.babelrc = false
  }

  if (!mainBabelOptions.babelrc) {
    mainBabelOptions.presets.push(require.resolve('./babel/preset'))
  }

  const rules = (dev ? [...styleLoaders({
    sourceMap: true
  })] : [...styleLoaders({
    extract: true
  })])
    .concat([
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {
        test: /\.(js|vue|json)(\?[^?]*)?$/,
        loader: 'emit-file-loader',
        include: [dir, nenvPagesDir],
        exclude (str) {
          return /node_modules/.test(str) && str.indexOf(nenvPagesDir) !== 0
        },
        options: {
          name: 'dist/[path][name].[ext]',
          interpolateName: (name) => name.replace('.vue', '.js'),
          validateFileName (file) {
            const cases = [{from: '.js', to: '.vue'}, {from: '.vue', to: '.js'}]

            for (const item of cases) {
              const { from, to } = item
              if (file.slice(-(from.length)) !== from) {
                continue
              }

              const filePath = file.slice(0, -(from.length)) + to

              if (existsSync(filePath)) {
                throw new Error(`Both ${from} and ${to} file found. Please make surce you only have one of both`)
              }
            }
          },
          transfrom ({ content, sourceMap, interpolatedName }) {
            if (!(/\.(js|vue)$/.test(interpolatedName))) {
              return { content, sourceMap }
            }

            const babelRuntimePath = require('babel-runtime/package').replace(/[\\/]package\.json$/, '')
            const transpiled = babelCore.transform(content, {
              babelrc: false,
              sourceMap: dev ? 'both' : false,

              plugins: [
                // require.resolve
                [require.resolve('babel-plugin-transfrom-es2015-modules-commonjs')],
                [
                  require.resolve('babel-plugin-module-resolver'),
                  {
                    alias: {
                      'babel-runtime': babelRuntimePath
                    }
                  }
                ]
              ],
              inputSourceMap: sourceMap
            })

            let { map } = transpiled
            let output = transpiled.code

            if (map) {
              let nodeMap = Object.assign({}, map)
              nodeMap.sources = nodeMap.sources.map((source) => source.replace(/\?entry/, ''))
              delete nodeMap.sourcesContent

              const sourceMapUrl = Buffer.from(JSON.stringify(nodeMap), 'utf-8').toString('base64')
              output = `${output}\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${sourceMapUrl}`
            }

            return {
              content: output,
              sourceMap: transpiled.map
            }
          }
        }
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: vueLoaderOptions
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        // include: [dir],
        exclude (str) {
          // console.log(str)
          return (/node_modules/.test(str) &&
            str.indexOf(join(__dirname, '..', '..')) !== 0) ||
            (str.indexOf(join(__dirname, '..', '..', 'node_modules')) === 0)
        },
        options: {
          //
          babelrc: false,
          cacheDirectory: true,
          presets: [require.resolve('./babel/preset')]
        }
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: assetsPath('img/[name].[hash:7].[ext]')
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: assetsPath('fonts/[name].[hash:7].[ext]')
        }
      },
      {
        test: /\.(webm|mp4)$/,
        loader: 'file-loader',
        options: {
          name: 'videos/[name].[hash:7].[ext]'
        }
      }
      // ,
      // {
      //   test: /\.(js|vue)(\?[^?]*)?$/,
      //   loader: 'babel-loader',
      //   include: [dir],
      //   exclude (str) {

      //   },
      //   options: mainBabelOptions
      // }
    ])

  let webpackConfig = {
    context: dir,
    entry,
    output: {
      path: buildDir ? join(buildDir, '.nenv') : join(dir, config.distDir),
      filename: '[name]',
      // publicPath: '/',
      strictModuleExceptionHandling: true,
      devtoolModuleFilenameTemplate ({ resourcePath }) {
        const hash = createHash('sha1')
        hash.update(Date.now() + '')
        const id = hash.digest('hex').slice(0, 7)
        return `webpack:///${resourcePath}?${id}`
      },
      chunkFilename: '[name]'
    },
    resolve: {
      extensions: ['.js', '.vue', '.json'],
      alias: {
        vue$: 'vue/dist/vue.esm.js',
        '@layouts': join(dir, 'layouts')
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
      // noParse: /es6/
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
