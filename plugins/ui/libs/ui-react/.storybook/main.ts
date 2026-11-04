import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs"],
  framework: { name: "@storybook/react-vite", options: {} },
  viteFinal: (cfg) =>
    mergeConfig(cfg, {
      resolve: {
        dedupe: [
          "react",
          "react-dom",
          "@mui/material",
          "@mui/system",
          "@emotion/react",
          "@emotion/styled",
        ],
      },
    }),
};

export default config;
