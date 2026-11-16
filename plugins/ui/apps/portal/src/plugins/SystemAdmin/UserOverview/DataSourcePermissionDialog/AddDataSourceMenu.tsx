import React, { FC, useMemo, useState } from "react";
import InputAdornment from "@mui/material/InputAdornment";
import CancelIcon from "@mui/icons-material/Cancel";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import { Button, IconButton, Menu, Spinner, TextField, type MenuItem } from "ui-react";
import { Study } from "../../../../types";
import { useTranslation } from "../../../../contexts";

interface AddDataSourceMenuProps {
  datasets: Study[];
  onAdd: (dataset: Study) => Promise<void>;
  disabled?: boolean;
}

export const AddDataSourceMenu: FC<AddDataSourceMenuProps> = ({ datasets, onAdd, disabled }) => {
  const { getText, i18nKeys } = useTranslation();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string>();

  const items: MenuItem[] = useMemo(() => {
    const term = search.trim().toLowerCase();
    return datasets
      .map((d) => ({ value: d.id, label: d.studyDetail?.name || d.id, disabled: adding != null }))
      .filter((item) => !term || item.label.toLowerCase().includes(term))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [datasets, search, adding]);

  const handleSelect = async (id: string) => {
    const dataset = datasets.find((d) => d.id === id);
    if (!dataset) return;
    setAdding(id);
    try {
      await onAdd(dataset);
    } finally {
      setAdding(undefined);
    }
  };

  return (
    <Menu
      items={[]}
      width={240}
      activator={({ open }) => (
        <Button variant="primary" prependIcon={<AddIcon />} disabled={disabled} onClick={open}>
          {getText(i18nKeys.DATA_SOURCE_PERMISSION__ADD_DATA_SOURCE)}
        </Button>
      )}
    >
      <div className="d2e-dsp-add">
        <div className="d2e-dsp-add__search">
          <TextField
            autofocus
            hideDetails
            value={search}
            placeholder={getText(i18nKeys.DATA_SOURCE_PERMISSION__SEARCH)}
            onChange={setSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">{adding ? <Spinner size={24} /> : <SearchIcon />}</InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton
                    className="d2e-dsp-add__clear"
                    category="no-stroke"
                    size="sm"
                    icon={<CancelIcon />}
                    ariaLabel={getText(i18nKeys.DATA_SOURCE_PERMISSION__CLEAR_SEARCH)}
                    onClick={() => setSearch("")}
                  />
                </InputAdornment>
              ) : undefined,
            }}
          />
        </div>
        {items.length === 0 ? (
          <p className="d2e-dsp-add__empty">{getText(i18nKeys.DATA_SOURCE_PERMISSION__NO_MATCH)}</p>
        ) : (
          <div className="d2e-dsp-add__list">
            <Menu items={items} width="100%" onSelect={handleSelect} />
          </div>
        )}
      </div>
    </Menu>
  );
};
