import "./src/loadDotEnv.ts";
import "reflect-metadata";
import { Server } from "./src/main.ts";

new Server().start();
