/**
 * Test script for MCP Client
 *
 * This script demonstrates how to use the MCP client to connect to the MCP server
 * and call various tools and prompts.
 *
 * Usage: deno run --allow-net --allow-env src/mcp/test-client.ts
 */

import { MCPClient } from "./client";
import { env } from "../env";

async function testMCPClient() {
  console.log("=== MCP Client Test ===\n");

  // Create headers for authentication
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
  };

  if (env.MCP_AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${env.MCP_AUTH_TOKEN}`;
  }

  if (env.MCP_DATASET_ID) {
    headers["datasetId"] = env.MCP_DATASET_ID;
  }

  // Initialize client
  const client = new MCPClient({
    serverUrl: env.MCP_SERVER_URL,
    headers,
    maxRetries: 3,
    retryDelay: 2000,
  });

  try {
    // Test 1: Connect to server
    console.log("Test 1: Connecting to MCP server...");
    await client.connect();
    console.log("✓ Connected successfully\n");

    // Test 2: List available tools
    console.log("Test 2: Listing available tools...");
    const tools = await client.listTools();
    console.log(`✓ Found ${tools.length} tools:`);
    tools.forEach((tool: any) => {
      console.log(`  - ${tool.name}: ${tool.description || "No description"}`);
    });
    console.log();

    // Test 3: List available prompts
    console.log("Test 3: Listing available prompts...");
    const prompts = await client.listPrompts();
    console.log(`✓ Found ${prompts.length} prompts:`);
    prompts.forEach((prompt: any) => {
      console.log(`  - ${prompt.name}: ${prompt.description || "No description"}`);
    });
    console.log();

    // Test 4: Call a tool (if available)
    if (tools.length > 0) {
      console.log("Test 4: Calling get_cohort_id_name_list tool...");
      try {
        const toolResponse = await client.callTool("get_cohort_id_name_list", {
          cohortInfo: "diabetes",
        });
        console.log("✓ Tool response:");
        console.log(JSON.stringify(toolResponse, null, 2));
        console.log();
      } catch (error) {
        console.log("✗ Tool call failed:", error.message);
        console.log();
      }
    }

    // Test 5: Get a prompt (if available)
    if (prompts.length > 0) {
      console.log("Test 5: Getting organize_cohort_ids_names_list prompt...");
      try {
        const promptResponse = await client.getPrompt("organize_cohort_ids_names_list", {
          cohortInfo: "diabetes patients",
        });
        console.log("✓ Prompt response:");
        console.log(JSON.stringify(promptResponse, null, 2));
        console.log();
      } catch (error) {
        console.log("✗ Prompt retrieval failed:", error.message);
        console.log();
      }
    }

    // Test 6: Check connection status
    console.log("Test 6: Checking connection status...");
    const isConnected = client.getConnectionStatus();
    console.log(`✓ Connection status: ${isConnected ? "Connected" : "Disconnected"}\n`);

    // Cleanup
    console.log("Disconnecting...");
    await client.disconnect();
    console.log("✓ Disconnected successfully\n");

    console.log("=== All tests completed ===");
  } catch (error) {
    console.error("✗ Test failed:", error);
    await client.disconnect();
    Deno.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.main) {
  testMCPClient();
}
