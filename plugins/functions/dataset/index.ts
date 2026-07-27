import express from "npm:express";
import { DatasetRouter } from "./router.ts";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));
app.use("/gateway/api/dataset", new DatasetRouter().router);
app.listen(8000);
