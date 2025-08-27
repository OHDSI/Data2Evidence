// Make this file a module for top-level await
export {};

// Run the Deno task 'start:server' from deno.json using Deno.Command (Deno v1.36+)
const command = new Deno.Command("deno", {
  args: ["task", "start:server"],
  stdout: "inherit",
  stderr: "inherit"
});
const { code } = await command.output();
Deno.exit(code ?? 0);
