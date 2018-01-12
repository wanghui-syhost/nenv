const babelRuntimePath = require.resolve('babel-runtime/package').replace(/[\\/]package\.json/, '')

// function styled

module.exports = (context, opts = {}) => ({
  presets: [
    [require.resolve('babel-preset-env'), {
      modules: false,
      useBuildIns: true,
      ...opts['preset-env']
    }],
    [require.resolve('babel-preset-stage-2')]
  ],
  plugins: [
    [require('babel-plugin-transform-runtime'), opts['transform-runtime'] || []],
    [
      require.resolve('babel-plugin-module-resolver'),
      {
        alias: {
          'babel-runtime': babelRuntimePath
        }
      }
    ]
  ]
})
