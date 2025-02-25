import React, { FC, HTMLAttributes, useEffect, useState } from "react";
import classNames from "classnames";
import { useScrollPosition } from "../../../../hooks";
import env from "../../../../env";
import { SearchBarDataset } from "./SearchBarDatasets";
import { AccountButton } from "./AccountButton";
import "./HomeHeader.scss";

interface HomeHeaderProps extends HTMLAttributes<HTMLDivElement> {
  searchKeyword?: string;
  onSearchEnter?: (keyword: string) => void;
  onSearchChange?: (keyword: string) => void;
}

export const HomeHeader: FC<HomeHeaderProps> = ({ searchKeyword, onSearchEnter, onSearchChange }) => {
  const scrollPosition = useScrollPosition();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const newScrolled = scrollPosition > 260;
    if (newScrolled !== scrolled) {
      setScrolled(newScrolled);
    }
  }, [scrollPosition]);

  const classes = classNames("home-header", {
    "home-header--scrolled": scrolled,
  });

  return (
    <div className={classes}>
      <img alt="Data2Evidence" src={`${env.PUBLIC_URL}/assets/d2e.svg`} height={30} />
      <SearchBarDataset keyword={searchKeyword} onEnter={onSearchEnter} onChange={onSearchChange} />
      <AccountButton />
    </div>
  );
};
