module.exports = {
  plugins: [
    [
      'component',
      {
        libraryName: 'element-ui',
        styleLibraryName: 'theme-chalk',
        style: true,
      },
    ],
  ],
  presets: [
    '@vue/cli-plugin-babel/preset',
  ],
}
