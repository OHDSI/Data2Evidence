import { configureStore } from "@reduxjs/toolkit";
import { flowReducers } from "../features/flow/reducers";
import { dataflowApiSlice } from "~/features/flow/slices";
import { webapiSlice } from "~/features/flow/slices/webapi-slice";
import { systemPortalSlice } from "~/features/flow/slices/system-portal-slice";

const rootReducers = {
  ...flowReducers,
  [dataflowApiSlice.reducerPath]: dataflowApiSlice.reducer,
  [webapiSlice.reducerPath]: webapiSlice.reducer,
  [systemPortalSlice.reducerPath]: systemPortalSlice.reducer,
};

const rootMiddlewares = [dataflowApiSlice.middleware, webapiSlice.middleware, systemPortalSlice.middleware];

export const store = configureStore({
  reducer: rootReducers,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(...rootMiddlewares),
});

export const dispatch = store.dispatch;

export type RootState = ReturnType<typeof store.getState>;
