import React from "react";
import { Feedback, IDbCredentialAdd } from "../../../types";

export function validateCredentials(
  credentials: IDbCredentialAdd[],
  setFeedback: React.Dispatch<React.SetStateAction<Feedback>>
) {
  const passwords = credentials.map((c) => c.password);
  const maxLength = 420;
  if (!passwords.every((p) => p)) {
    setFeedback({
      type: "error",
      message: "Please ensure all passwords to have valid length",
    });
    return false;
  } else if (!passwords.every((p) => p.length <= maxLength)) {
    setFeedback({
      type: "error",
      message: `Please ensure all passwords to have the maximum length of ${maxLength}`,
    });
    return false;
  }
  return true;
}

export function isValidDbCode(code: string, setFeedback: React.Dispatch<React.SetStateAction<Feedback>>) {
  const r = RegExp(/^[A-Za-z0-9_]+$/)

  if (r.test(code)) {
    return true;
  }
  setFeedback({
    type: "error",
    message: "Database code is invalid; lowercase and uppercase letters, numbers and underscore are valid characters",
  });
  return false;
}