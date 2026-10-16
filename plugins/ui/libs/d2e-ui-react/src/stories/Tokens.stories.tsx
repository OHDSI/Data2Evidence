import type { Meta, StoryObj } from "@storybook/react-vite";
import { tokens } from "../tokens/tokens";

const meta = {
  title: "Foundations/Tokens",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const h2 = {
  margin: "0 0 12px",
  font: "600 18px/1.2 var(--d2e-font-family)",
  color: "var(--d2e-color-primary)",
} as const;

const label = {
  font: "500 12px/1.4 var(--d2e-font-family)",
  color: "var(--d2e-color-neutral)",
} as const;

const mono = {
  font: "12px/1.4 ui-monospace, monospace",
  color: "var(--d2e-color-neutral)",
} as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={h2}>{title}</h2>
      {children}
    </section>
  );
}

export const Tokens: Story = {
  render: () => (
    <div style={{ maxWidth: 900, fontFamily: "var(--d2e-font-family)" }}>
      <Section title="Colors">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 150px)", gap: 16 }}>
          {Object.entries(tokens.color).map(([name, value]) => (
            <div key={name}>
              <div
                style={{
                  height: 56,
                  borderRadius: 8,
                  background: value,
                  border: "1px solid rgba(0,0,0,0.1)",
                }}
              />
              <div style={{ ...label, marginTop: 6 }}>{name}</div>
              <div style={mono}>{value}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Object.entries(tokens.font)
            .filter(([, v]) => typeof v === "object")
            .map(([name, spec]) => {
              const s = spec as {
                size: number;
                weight: number;
                lineHeight: number | string;
                letterSpacing: string;
              };
              return (
                <div key={name} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                  <div style={{ ...mono, width: 150, flex: "none" }}>
                    {name} · {s.size}/{s.weight}
                  </div>
                  <div
                    style={{
                      fontSize: s.size,
                      fontWeight: s.weight,
                      lineHeight: s.lineHeight,
                      letterSpacing: s.letterSpacing,
                      color: "var(--d2e-color-neutral-black)",
                    }}
                  >
                    The quick brown fox
                  </div>
                </div>
              );
            })}
        </div>
      </Section>

      <Section title="Spacing">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(tokens.spacing).map(([name, value]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ ...mono, width: 110 }}>{name} · {value}px</div>
              <div style={{ height: 12, width: value, background: "var(--d2e-color-primary)", borderRadius: 2 }} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {Object.entries(tokens.radius).map(([name, value]) => (
            <div key={name} style={{ textAlign: "center" }}>
              <div
                style={{
                  height: 64,
                  width: 64,
                  borderRadius: value,
                  background: "var(--d2e-color-primary-xtra-lightest)",
                  border: "1px solid var(--d2e-color-primary-lighter)",
                }}
              />
              <div style={{ ...mono, marginTop: 6 }}>{name} · {value}px</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Elevation">
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", padding: 8 }}>
          {Object.entries(tokens.elevation).map(([name, value]) => (
            <div key={name} style={{ textAlign: "center" }}>
              <div
                style={{
                  height: 64,
                  width: 96,
                  borderRadius: 8,
                  background: "var(--d2e-color-white)",
                  boxShadow: value,
                }}
              />
              <div style={{ ...mono, marginTop: 10 }}>{name}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  ),
};
