import React, { FC } from "react";
import { OidcApp } from "./containers/auth/oidc/OidcApp";
import "easymde/dist/easymde.min.css";
import "./App.scss";

export const App: FC = () => {
  return <OidcApp />;
};
