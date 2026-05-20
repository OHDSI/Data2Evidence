import React, { FC } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { config } from "../config";
import { Public } from "../containers/public/Public";
import { Login } from "../containers/auth/Login";
import { PublicRoot } from "../containers/public/PublicRoot";

export const PublicApp: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<PublicRoot />} />
      <Route path={`${config.ROUTES.public}/*`} element={<Public />} />
      <Route path={config.ROUTES.login} element={<Login />} />
      <Route path="*" element={<Navigate to={config.ROUTES.login} />} />
    </Routes>
  );
};
