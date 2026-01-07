import { PayloadAction, ThunkAction } from "@reduxjs/toolkit";
import { RootState } from "./store";

export * from "./store";
export type ThunkResult<R> = ThunkAction<
  R,
  RootState,
  undefined,
  PayloadAction<any>
>;
