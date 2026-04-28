import express from "express";
import { DemoController } from "./controllers/DemoController.ts";

const app = express();

app.use(express.json());
app.use("/demo", new DemoController().router);
app.listen(8000);
