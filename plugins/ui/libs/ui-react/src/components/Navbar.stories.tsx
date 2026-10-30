import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Navbar, NavItem, NavUser, type NavbarVariant } from "./Navbar";

const meta = {
  title: "Layout/Navbar",
  component: Navbar,
  args: { variant: "next" },
  argTypes: {
    variant: { control: "inline-radio", options: ["classic", "next"] },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

const NEXT_LINKS = [
  "Data Sources",
  "Concepts",
  "Data Exploration",
  "Cohort Definitions",
  "Analysis",
  "Studies",
];

const CLASSIC_LINKS = [
  "Datasets",
  "Concepts",
  "Cohorts",
  "Analysis",
  "Wizards",
  "Notebook",
  "Dashboard",
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ padding: "0 16px", font: "600 13px/1.2 var(--d2e-font-family)", color: "var(--d2e-color-neutral)" }}>
        {title}
      </span>
      {children}
    </section>
  );
}

// A live navbar: click a link to select it. `disabledItem` stays non-interactive.
function NavbarDemo({
  variant,
  links,
  endLabel,
  disabledItem,
}: {
  variant: NavbarVariant;
  links: string[];
  endLabel: string;
  disabledItem?: string;
}) {
  const [active, setActive] = useState(links[0]);
  const end =
    variant === "next" ? <NavUser name={endLabel} /> : <NavItem>{endLabel}</NavItem>;
  return (
    <Navbar variant={variant} end={end}>
      {links.map((label) => (
        <NavItem
          key={label}
          selected={active === label}
          disabled={label === disabledItem}
          onClick={() => setActive(label)}
        >
          {label}
        </NavItem>
      ))}
    </Navbar>
  );
}

// Consolidated reference: both navbar styles. "next" is the Aug-2026 target
// (navy links, coral underline); "classic" is the current portal (grey links,
// navy bar). Links are clickable; a disabled item is shown in each.
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "16px 0" }}>
      <Section title="Next (Aug 2026)">
        <NavbarDemo variant="next" links={NEXT_LINKS} endLabel="john.doe_researcher" disabledItem="Studies" />
      </Section>
      <Section title="Classic (current)">
        <NavbarDemo variant="classic" links={CLASSIC_LINKS} endLabel="Account" disabledItem="Dashboard" />
      </Section>
    </div>
  ),
};

export const Playground: Story = {
  render: (args) => {
    const variant = (args.variant ?? "next") as NavbarVariant;
    return (
      <NavbarDemo
        variant={variant}
        links={variant === "classic" ? CLASSIC_LINKS : NEXT_LINKS}
        endLabel={variant === "classic" ? "Account" : "john.doe_researcher"}
      />
    );
  },
};
