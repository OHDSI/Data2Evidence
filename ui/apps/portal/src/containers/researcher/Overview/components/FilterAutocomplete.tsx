import React from "react";
import { Autocomplete, AutocompleteProps, ChevronDownIcon, Chip } from "@portal/components";
import { FilterTextField } from "./FilterTextField";
import styled from "@emotion/styled";

export interface AutocompleteOption {
  id: string;
  label: string;
}

export interface FilterAutocompleteProps
  extends Omit<AutocompleteProps<AutocompleteOption, true, false, false>, "renderInput"> {}

const StyledChip = styled(Chip)(() => ({
  borderRadius: "0.5em",
  border: "1px solid var(--color-primary)",

  ".MuiSvgIcon-root": {
    color: "#000080",

    "&:hover": {
      color: "#000080",
    },
  },
}));

export const FilterAutocomplete = ({
  placeholder,
  multiple = true,
  freeSolo = false,
  ...props
}: FilterAutocompleteProps) => {
  return (
    <Autocomplete<AutocompleteOption, true, false, false>
      {...props}
      multiple={multiple}
      freeSolo={freeSolo}
      renderTags={(value: AutocompleteOption[], getTagProps) =>
        value.map((opt: AutocompleteOption, index: number) => (
          <StyledChip variant="outlined" label={opt.label} {...getTagProps({ index })} key={opt.id} />
        ))
      }
      renderInput={(inputProps) => {
        return (
          <FilterTextField
            {...inputProps}
            placeholder={!props.value || props.value.length === 0 ? placeholder : undefined}
          />
        );
      }}
      popupIcon={<ChevronDownIcon />}
    />
  );
};
