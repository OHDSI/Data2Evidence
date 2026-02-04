import { seed } from "./src/seed"

try {
    await seed();
} catch (error) {
    console.error("FHIR gateway init failed:", error);
    // Don't re-throw - this is an init script, failing gracefully is better than crashing the runtime
}
