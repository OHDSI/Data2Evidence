import { defineConfig } from "histoire";
import { HstVue } from "@histoire/plugin-vue";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

export default defineConfig({
  plugins: [HstVue()],
  setupFile: "./histoire.setup.ts",
  storyMatch: ["src/components/**/*.story.vue"],
  theme: { title: "D2E UI" },
  tree: {
    groups: [
      { id: "top", title: "" },
      { id: "components", title: "Components" },
    ],
  },
  // There is no vite.config.ts in this package. Histoire needs the Vue and
  // Vuetify plugins and the alias declared here explicitly.
  vite: {
    plugins: [vue(), vuetify({ autoImport: true })],
    resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  },
});
