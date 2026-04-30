import express from "express";
import { DBRouter } from "./DBRouter.ts";
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use("/gateway/api/db", new DBRouter().router);
app.listen(8000);
