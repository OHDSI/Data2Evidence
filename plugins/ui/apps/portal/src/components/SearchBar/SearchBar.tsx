import React, { FC, useEffect, useState } from "react";
import InputBase from "@mui/material/InputBase";
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/Search";
import { ArrowCircleRightIcon } from "@portal/components";
import { useTranslation } from "../../contexts";
import "./SearchBar.scss";

interface SearchBarProps {
  keyword?: string;
  placeholder?: string;
  onEnter?: (keyword: string) => void;
  onChange?: (keyword: string) => void;
  width?: string;
  height?: string;
}

const SearchBar: FC<SearchBarProps> = ({
  keyword,
  placeholder,
  onEnter,
  onChange,
  width = "100%",
  height = "40px",
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [searchString, setSearchString] = useState("");
  const placeholderText = placeholder || getText(i18nKeys.SEARCH_BAR__SEARCH);

  useEffect(() => {
    setSearchString(keyword || "");
  }, [keyword]);

  return (
    <div className="search-bar" style={{ width, height }}>
      <SearchIcon sx={{ color: "#000080", p: "8px", ml: "8px", alignSelf: "center", width: "38px", height: "38px" }} />
      <InputBase
        sx={{ width: "100%" }}
        placeholder={placeholderText}
        inputProps={{ "aria-label": getText(i18nKeys.SEARCH_BAR__SEARCH_TERMS) }}
        value={searchString}
        onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.key == "Enter") {
            typeof onEnter === "function" && onEnter(searchString || "");
          }
        }}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          const searchString = event.target.value;
          setSearchString(searchString);
          typeof onChange === "function" && onChange(searchString);
        }}
      />
      <IconButton
        type="button"
        sx={{ mr: "8px" }}
        aria-label={getText(i18nKeys.SEARCH_BAR__SEARCH)}
        onClick={() => typeof onEnter === "function" && onEnter(searchString || "")}
      >
        <ArrowCircleRightIcon />
      </IconButton>
    </div>
  );
};

export default SearchBar;
