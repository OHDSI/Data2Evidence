import React, { ReactNode } from "react";

/** A value to render in bold; a plain string renders as is. */
export type NameArg = string | { bold: string };

/**
 * Fills `{0}`, `{1}`, ... in a phrase with React children, so markup inside a name renders as text.
 * A placeholder with no matching argument renders nothing.
 */
export const withNames = (phrase: string, args: NameArg[]): ReactNode =>
  phrase.split(/\{(\d+)\}/).map((part, i) => {
    if (i % 2 === 0) return part;
    const arg = args[Number(part)];
    if (arg === undefined) return null;
    return typeof arg === "string" ? arg : <strong key={i}>{arg.bold}</strong>;
  });
