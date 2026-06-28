import 'reflect-metadata';
import { bootstrap } from "./src/bootstrap.ts";
import { initialiseDataSource } from "./src/database/postgres.service.ts";

// Build TypeORM entity metadata and connect before the DI graph (repositories)
// is constructed and before the server starts serving, so no request can race
// DataSource initialisation (see postgres.service.ts).
await initialiseDataSource();

const application = await bootstrap();
await application.listen(Number(Deno.env.get("PORT") || 3000));
