import { FC, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { TableMapLayout } from "./Table/TableMapLayout";
import { FieldMapLayout } from "./Field/FieldMapLayout";
import { MappingFileDialogController } from "./components/MappingFileDialogController";
import { useApp } from "./contexts";
import "./MappingLayout.css";

interface MappingLayoutProps {
  mappingSuggestion?: boolean;
}

export const MappingLayout: FC<MappingLayoutProps> = ({ mappingSuggestion }) => {
  const { setMappingSuggestion } = useApp();

  useEffect(() => {
    setMappingSuggestion(mappingSuggestion || false);
  }, [mappingSuggestion]);

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
