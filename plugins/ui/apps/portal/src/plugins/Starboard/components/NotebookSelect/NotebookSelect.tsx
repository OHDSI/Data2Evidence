import React, { FC, useCallback } from "react";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { SelectChangeEvent } from "@mui/material/Select";
import { FormControl } from "@mui/material";
import { SxProps } from "@mui/system";
import { StarboardNotebook } from "../../utils/notebook";
import { useTranslation } from "../../../../contexts";

interface NotebookSelectProps {
  notebooks: StarboardNotebook[] | undefined;
  activeNotebook: StarboardNotebook | undefined;
  updateActiveNotebook: (notebook?: StarboardNotebook) => void;
  setIsShared: React.Dispatch<React.SetStateAction<boolean | undefined>>;
}

const styles: SxProps = {
  color: "#000080",
  ".MuiInputLabel-root": {
    color: "#000080",
    "&.MuiInputLabel-shrink, &.Mui-focused": {
      color: "var(--color-neutral)",
    },
  },
  ".MuiInput-input:focus": {
    backgroundColor: "transparent",
    color: "#000080",
  },
  ".MuiInput-root": {
    "&::after, &:hover:not(.Mui-disabled)::before": {
      borderBottom: "2px solid #000080",
    },
  },
  "&.MuiMenuItem-root:hover": {
    backgroundColor: "#ebf2fa",
  },

  ".MuiOutlinedInput-notchedOutline": {
    borderWidth: "0",
  },

  "&.Mui-focused": {
    ".MuiOutlinedInput-notchedOutline": {
      borderWidth: "0",
    },
  },
};

const NotebookSelect: FC<NotebookSelectProps> = ({ notebooks, activeNotebook, updateActiveNotebook, setIsShared }) => {
  const { getText, i18nKeys } = useTranslation();
  const handleNotebookChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      const findNb = notebooks && notebooks.find((nb) => nb.id === event.target.value);
      updateActiveNotebook(findNb);
      setIsShared(findNb?.isShared);
    },
    [notebooks, updateActiveNotebook]
  );

  return (
    <FormControl sx={styles}>
      <Select value={activeNotebook?.id} onChange={handleNotebookChange} sx={styles}>
        {notebooks &&
          notebooks.map((nb: StarboardNotebook) => (
            <MenuItem value={nb.id} key={nb.id} sx={styles}>
              {`${nb.name} ${nb.isShared ? getText(i18nKeys.NOTEBOOK_SELECT__SHARED) : ""}`}
            </MenuItem>
          ))}
      </Select>
    </FormControl>
  );
};

export default NotebookSelect;
