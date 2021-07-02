module.exports = {
  plugins: [
    ['module-resolver', {
      root: ["./"],
      alias: {
        "src": "./src",
        "test": "./test",
      }
    }],
  ],
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript'
  ]
}