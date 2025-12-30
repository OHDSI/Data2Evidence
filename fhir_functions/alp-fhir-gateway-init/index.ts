import { seed } from "./src/seed"
console.log("Starting FHIR Gateway DB Seed");
await seed();
