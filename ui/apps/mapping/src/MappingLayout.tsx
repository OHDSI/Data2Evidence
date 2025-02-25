import { FC } from "react";
import { Route, Routes } from "react-router-dom";
import { TableMapLayout } from "./Table/TableMapLayout";
import { FieldMapLayout } from "./Field/FieldMapLayout";
import { MappingFileDialogController } from "./components/MappingFileDialogController";
import "./MappingLayout.css";

export const MappingLayout: FC = () => {
  return (
    <div className="mapping-layout">
      <div className="content-container">
        <Routes>
          <Route index element={<TableMapLayout />} />
          <Route path="link-fields" element={<FieldMapLayout />} />
        </Routes>
        <MappingFileDialogController />
      </div>
    </div>
  );
};
