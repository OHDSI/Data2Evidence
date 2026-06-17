module.exports = {
  "stories": ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  "addons": ["@storybook/addon-links", "@storybook/addon-essentials", "@storybook/addon-interactions", "@storybook/preset-scss"],
  "framework": "@storybook/react",
  core: {
    builder: "webpack5"
  },
  // Disable TS docgen: SB 6.5's plugin calls ts.createIdentifier, removed in TS 5.0.
  typescript: {
    reactDocgen: false,
  },
};
