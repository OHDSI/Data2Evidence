import { seed } from "./src/seed"

try {
    await seed();
} catch (error) {
    console.error("FHIR gateway init failed:", error);
}
