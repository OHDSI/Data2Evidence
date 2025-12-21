import express from "express";
import { HelloWorldController } from "./controllers/HelloWorldController.js";

const app = express();

app.use(express.json());
app.use("/hello-world", new HelloWorldController().router);
app.listen(8000);
