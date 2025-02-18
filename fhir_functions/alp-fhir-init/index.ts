import {seed} from "./src/seed.ts"
import {readAndCreateBotFromConfig} from "./src/loadBots.ts"

await seed()
readAndCreateBotFromConfig()