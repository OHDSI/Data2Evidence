import { configureStore } from "@reduxjs/toolkit";
import { flowReducers } from "../features/flow/reducers";
import { dataflowApiSlice } from "~/features/flow/slices";
import { whiteRabbitApiSlice } from "~/features/flow/slices";

const rootReducers = {
  ...flowReducers,
  [dataflowApiSlice.reducerPath]: dataflowApiSlice.reducer,
  [whiteRabbitApiSlice.reducerPath]: whiteRabbitApiSlice.reducer,
};

const rootMiddlewares = [
  dataflowApiSlice.middleware,
  whiteRabbitApiSlice.middleware,
];

export const store = configureStore({
  reducer: rootReducers,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(...rootMiddlewares),
});

export const dispatch = store.dispatch;

export type RootState = ReturnType<typeof store.getState>;
