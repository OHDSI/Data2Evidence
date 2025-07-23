const path = require("path");
const fs = require("fs");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const HtmlWebPackPlugin = require("html-webpack-plugin");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";
  const isBuild = env.build;
  const publicPath = isProduction
    ? "/flow/"
    : isBuild
    ? "https://localhost:4900/flow/"
    : "/";

  const entryFile = isBuild ? "module.ts" : "index.tsx";
  const externals = isBuild ? ["react"] : [];

  return {
    mode: argv.mode,
    devtool: isProduction ? false : "source-map",
    devServer: {
      https: {
        key: fs.readFileSync(
          path.resolve(__dirname, "../../.cert/local_alp_portal_private.key")
        ),
        cert: fs.readFileSync(
          path.resolve(__dirname, "../../.cert/local_alp_portal_public.crt")
        ),
      },
      port: 4900,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers":
          "X-Requested-With, content-type, Authorization",
      },
      proxy: [
        {
          context: ["/jobplugins"],
          target: "https://localhost:41100",
          secure: false,
        },
        {
          context: ["/mapping"],
          target: "https://localhost:41100",
          secure: false,
        },
        {
          context: ["/resources/concept-mapping"],
          target: "https://localhost:41100",
          secure: false,
        },
        {
          context: ["/white-rabbit"],
          target: "https://localhost:41100",
          secure: false,
        },
        {
          context: ["/system-portal"],
          target: "https://localhost:41100",
          secure: false,
        },
        {
          context: ["/backend"],
          target: "https://localhost:41100",
          secure: false,
        },
      ],
    },
    entry: {
      module: path.join(__dirname, "src", entryFile),
    },
    output: {
      path: isProduction
        ? path.resolve(__dirname, "../../resources/flow")
        : path.resolve(__dirname, "dist"),
      filename: "[name].js",
      libraryTarget: "umd",
      umdNamedDefine: true,
      globalObject: "self",
      publicPath,
    },
    externals,
    target: "web",
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
      alias: {
        "~": path.resolve(__dirname, "src"),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: "/node_modules/",
          use: "ts-loader",
        },
        {
          test: /\.(css|scss)$/,
          use: ["style-loader", "css-loader", "sass-loader"],
        },
      ],
    },
    optimization: {
      minimize: isProduction,
      minimizer: [new TerserPlugin()],
    },
    plugins: [
      new CleanWebpackPlugin(),
      new HtmlWebPackPlugin({
        template: path.resolve(__dirname, "src/index.html"),
        filename: "index.html",
      }),
      new MonacoWebpackPlugin({
        languages: ["python", "sql", "json", "r"],
      }),
    ],
  };
};
