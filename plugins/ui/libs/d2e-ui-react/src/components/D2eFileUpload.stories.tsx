import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { D2eFileUpload } from "./D2eFileUpload";
import { D2eFileUploadItem } from "./D2eFileUploadItem";

const meta = {
  title: "Inputs/D2eFileUpload",
  component: D2eFileUpload,
  args: { density: "default", hint: "json (max. 3 MB)" },
  argTypes: {
    density: { control: "inline-radio", options: ["default", "compact"] },
  },
} satisfies Meta<typeof D2eFileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

const FILE = "Transform FHIR patient to OMOP person.json";

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h3
        style={{
          margin: 0,
          font: "600 16px/1.2 var(--d2e-font-family)",
          color: "var(--d2e-color-primary)",
        }}
      >
        {label}
      </h3>
      {children}
    </section>
  );
}

export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 760 }}>
      <Group label="Dropzone — default density">
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ width: 280 }}>
            <D2eFileUpload density="default" />
          </div>
          <div style={{ width: 280 }}>
            <D2eFileUpload density="default" disabled />
          </div>
        </div>
      </Group>

      <Group label="Dropzone — compact density">
        <D2eFileUpload density="compact" />
        <D2eFileUpload density="compact" disabled />
      </Group>

      <Group label="File items">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: "1px solid var(--d2e-color-neutral-lighter)",
            borderRadius: 8,
          }}
        >
          <D2eFileUploadItem name={FILE} size="100 kB" status="default" onRemove={() => {}} />
          <D2eFileUploadItem
            name={FILE}
            size="100 kB"
            status="uploading"
            statusText="Uploading 45%"
            onRemove={() => {}}
          />
          <D2eFileUploadItem
            name={FILE}
            size="100 kB"
            status="complete"
            statusText="Complete"
            onDelete={() => {}}
          />
          <D2eFileUploadItem
            name={FILE}
            status="error"
            errorText="File too large (max. 3 MB)"
            statusText="Upload failed"
            onDelete={() => {}}
          />
        </div>
      </Group>
    </div>
  ),
};

export const Playground: Story = {
  render: (args) => {
    const [names, setNames] = useState<string[]>([]);
    return (
      <div style={{ width: 320 }}>
        <D2eFileUpload
          {...args}
          onFilesSelected={(files) => setNames(files.map((f) => f.name))}
        >
          {names.map((name) => (
            <D2eFileUploadItem
              key={name}
              name={name}
              status="complete"
              statusText="Complete"
              onDelete={() => setNames((n) => n.filter((x) => x !== name))}
            />
          ))}
        </D2eFileUpload>
      </div>
    );
  },
};
