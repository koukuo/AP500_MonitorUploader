const InjectPlugin = require('webpack-inject-plugin').default;

const pkg = require('./package.json');

const now = new Date()
const version = `_${now.getMonth() + 1}_${now.getDate()}_`
module.exports = {
  productionSourceMap: true,
  publicPath: './',
  css: {
    sourceMap: true,
  },
  lintOnSave: false,
  configureWebpack: {
    plugins: [
      new InjectPlugin(() => `window.UI_VERSION = 'UI Version: [${pkg.name}]_${version}'; console.log(window.UI_VERSION)`),
    ],
  },
  pluginOptions:{
    electronBuilder:{
      nodeIntegration:true
    }
  }
};
