export default function globalSetup() {
  if (!process.env.BEARER_TOKEN) {
    console.error("ERROR: BEARER_TOKEN is not set — set it via the BEARER_TOKEN environment variable and re-run.");
    process.exit(1);
  }
}
