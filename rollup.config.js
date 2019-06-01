const path = require('path')
const babel = require('rollup-plugin-babel')
const resolve = require('rollup-plugin-node-resolve')
const ts = require('rollup-plugin-typescript2')
const fs = require('fs-extra')
const { dts } = require('rollup-plugin-dts')
const { terser } = require('rollup-plugin-terser')
const { sizeSnapshot } = require('rollup-plugin-size-snapshot')

const root = process.platform === 'win32' ? path.resolve('/') : '/'
const external = id => !id.startsWith('.') && !id.startsWith(root)
const extensions = ['.tsx', '.ts', '.js']
const rewritePaths = path =>
  path.startsWith('shared') ? '@react-spring/' + path : path

// Every module in the "input" directory gets its own bundle.
export const multiBundle = ({
  input = 'src',
  output = 'dist',
  ...config
} = {}) =>
  fs.readdirSync(input).reduce(
    (configs, file) =>
      configs.concat(
        bundle({
          input: path.join(input, file),
          output: path.join(output, file.replace(/\.tsx?$/, '.js')),
          ...config,
        })
      ),
    []
  )

export const bundle = ({
  input = 'src/index.ts',
  output = 'dist/index.js',
  minify = true,
  sourcemap = true,
} = {}) => {
  const config = { input, output, minify, sourcemap }
  return [esmBundle(config), cjsBundle(config), dtsBundle(config)]
}

export const esmBundle = config => ({
  input: config.input,
  output: {
    file: config.output,
    format: 'esm',
    sourcemap: config.sourcemap,
    paths: rewritePaths,
  },
  external,
  plugins: [
    resolve({ extensions }),
    ts({ check: false }),
    babel(
      getBabelOptions(
        { useESModules: true },
        '>1%, not dead, not ie 11, not op_mini all'
      )
    ),
    sizeSnapshot(),
    config.minify && terser(),
  ],
})

export const cjsBundle = config => ({
  input: config.input,
  output: {
    file: config.output.replace(/\.js$/, '.cjs.js'),
    format: 'cjs',
    sourcemap: config.sourcemap,
    paths: rewritePaths,
  },
  external,
  plugins: [
    resolve({ extensions }),
    ts({ check: false }),
    babel(getBabelOptions({ useESModules: false })),
    sizeSnapshot(),
    config.minify && terser(),
  ],
})

export const dtsBundle = config => ({
  input: config.input,
  output: [
    {
      file: config.output.replace(/\.js$/, '.d.ts'),
      format: 'es',
      paths: rewritePaths,
    },
  ],
  plugins: [dts()],
  external,
})

export const getBabelOptions = ({ useESModules }, targets) => ({
  babelrc: false,
  exclude: '**/node_modules/**',
  runtimeHelpers: true,
  presets: [
    ['@babel/preset-env', { loose: true, modules: false, targets }],
    '@babel/preset-react',
    // TODO: Use this when it can strip re-exported types!
    // '@babel/preset-typescript',
  ],
  plugins: [
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    ['@babel/plugin-proposal-object-rest-spread', { loose: true }],
    ['@babel/plugin-transform-runtime', { regenerator: false, useESModules }],
  ],
})
