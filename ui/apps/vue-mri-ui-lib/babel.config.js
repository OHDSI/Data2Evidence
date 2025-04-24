module.exports = function (api) {
  api.cache.invalidate(() => process.env.NODE_ENV)
  let presets = ['@vue/cli-plugin-babel/preset']

  // if (api.env("test")) {
  //   presets = ["@babel/preset-env"];
  // }

  return {
    presets,
  }
}
