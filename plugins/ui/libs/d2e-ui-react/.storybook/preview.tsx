import type { Preview } from "@storybook/react-vite";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { buildD2eMuiTheme } from "../src/tokens/theme";
import "../src/tokens/tokens.css";

const theme = buildD2eMuiTheme();

const preview: Preview = {
  parameters: {
    options: {
      // Self-contained: Storybook serializes this fn into the manager, so it may
      // not reference anything outside its own body.
      storySort: (a, b) => {
        const sections = ["Foundations", "Inputs", "Data display", "Feedback", "Layout"];
        const sectionRank = (title) => {
          const i = sections.indexOf(title.split("/")[0]);
          return i === -1 ? sections.length : i;
        };
        const storyRank = (name) =>
          name === "Showcase" ? -1 : name === "Playground" ? 1 : 0;
        const sa = sectionRank(a.title);
        const sb = sectionRank(b.title);
        if (sa !== sb) return sa - sb;
        if (a.title !== b.title) return a.title.localeCompare(b.title);
        const ra = storyRank(a.name);
        const rb = storyRank(b.name);
        if (ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name);
      },
    },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: {
      default: "white",
      values: [
        { name: "white", value: "#FFFFFF" },
        { name: "d2e", value: "#FAF8F8" },
      ],
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ padding: 24, fontFamily: "var(--d2e-font-family)" }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default preview;
