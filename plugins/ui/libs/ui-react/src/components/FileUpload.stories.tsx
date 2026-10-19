import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileUpload } from "./FileUpload";
import { FileUploadItem } from "./FileUploadItem";

const meta = {
  title: "Inputs/FileUpload",
  component: FileUpload,
  args: { density: "default", hint: "json (max. 3 MB)" },
  argTypes: {
    density: { control: "inline-radio", options: ["default", "compact"] },
  },
} satisfies Meta<typeof FileUpload>;

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
            <FileUpload density="default" />
          </div>
          <div style={{ width: 280 }}>
            <FileUpload density="default" disabled />
          </div>
        </div>
      </Group>

      <Group label="Dropzone — compact density">
        <FileUpload density="compact" />
        <FileUpload density="compact" disabled />
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
          <FileUploadItem name={FILE} size="100 kB" status="default" onRemove={() => {}} />
          <FileUploadItem
            name={FILE}
            size="100 kB"
            status="uploading"
            statusText="Uploading 45%"
            onRemove={() => {}}
          />
          <FileUploadItem
            name={FILE}
            size="100 kB"
            status="complete"
            statusText="Complete"
            onDelete={() => {}}
          />
          <FileUploadItem
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
        <FileUpload
          {...args}
          onFilesSelected={(files) => setNames(files.map((f) => f.name))}
        >
          {names.map((name) => (
            <FileUploadItem
              key={name}
              name={name}
              status="complete"
              statusText="Complete"
              onDelete={() => setNames((n) => n.filter((x) => x !== name))}
            />
          ))}
        </FileUpload>
      </div>
    );
  },
};
