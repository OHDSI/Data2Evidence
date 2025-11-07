import React, { FC } from "react";
import { LegalCard } from "./LegalCard";
import "./Legal.scss";

export const Legal: FC = () => {
  return (
    <div className="legal">
      <div className="legal__container">
        <div className="legal__content">
          <LegalCard />
        </div>
      </div>
    </div>
  );
};
