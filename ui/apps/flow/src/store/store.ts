import { configureStore } from "@reduxjs/toolkit";
import { flowReducers } from "../features/flow/reducers";
import { dataflowApiSlice, whiteRabbitApiSlice, dbApiSlice } from "~/features/flow/slices";

const rootReducers = {
  ...flowReducers,
  [dataflowApiSlice.reducerPath]: dataflowApiSlice.reducer,
  [whiteRabbitApiSlice.reducerPath]: whiteRabbitApiSlice.reducer,
  [dbApiSlice.reducerPath]: dbApiSlice.reducer,
};

const rootMiddlewares = [
  dataflowApiSlice.middleware,
  whiteRabbitApiSlice.middleware,
  dbApiSlice.middleware,
];

export const store = configureStore({
  reducer: rootReducers,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(...rootMiddlewares),
});

export const dispatch = store.dispatch;

export type RootState = ReturnType<typeof store.getState>;
