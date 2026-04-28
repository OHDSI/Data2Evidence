import React, { forwardRef } from "react";
import { default as MuiAutocomplete, AutocompleteProps as MuiAutocompleteProps } from "@mui/material/Autocomplete";

export type AutocompleteProps<
  T,
  Multiple extends boolean | undefined = undefined,
  DisableClearable extends boolean | undefined = undefined,
  FreeSolo extends boolean | undefined = undefined
> = MuiAutocompleteProps<T, Multiple, DisableClearable, FreeSolo>;

export const Autocomplete = <
  T,
  Multiple extends boolean | undefined = undefined,
  DisableClearable extends boolean | undefined = undefined,
  FreeSolo extends boolean | undefined = undefined
>(
  props: AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>
) => <MuiAutocomplete<T, Multiple, DisableClearable, FreeSolo> {...props} />;
