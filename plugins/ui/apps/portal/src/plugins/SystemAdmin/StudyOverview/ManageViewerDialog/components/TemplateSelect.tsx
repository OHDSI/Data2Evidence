import React, { FC } from "react";
import { Select, MenuItem } from "@portal/components";
import InputLabel from "@mui/material/InputLabel";
import { StudyDashboardTemplateData } from "../../../../../types";

interface TemplateSelectProps {
  templates: StudyDashboardTemplateData[];
  selectedTemplate: string;
  onTemplateChange: (filename: string) => void;
}

export const TemplateSelect: FC<TemplateSelectProps> = ({
  templates,
  selectedTemplate,
  onTemplateChange,
}) => {
  return (
    <div>
      <InputLabel sx={{ mb: 1 }}>Template</InputLabel>
      <Select
        sx={{ width: "100%" }}
        variant="standard"
        value={selectedTemplate}
        onChange={(event) => onTemplateChange(event.target.value)}
      >
        <MenuItem value="default">
          <em>Default</em>
        </MenuItem>
        {templates.map((template) => (
          <MenuItem key={template.filename} value={template.filename}>
            {template?.filename}
          </MenuItem>
        ))}
      </Select>
    </div>
  );
};
