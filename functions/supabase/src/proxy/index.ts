import { serve } from "https://deno.land/std/http/server.ts";

// TODO: get from env
const STORAGE_URL = "http://alp-supabase-storage-1:9000";
// TODO: get from env
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInBvc3RncmVzIiwKICAiaXNzIjogInN1cGFiYXNlIiwKICAiaWF0IjogMTczOTExNjgwMCwKICAiZXhwIjogMTg5Njg4MzIwMAp9.1nxBnV9cvss5HsM3VlrRnGM2eGuSo3RXu4mU2PBXdSU";

// The schema where your storage tables are located
const STORAGE_SCHEMA = "storage";

async function verifyUserHasStorageAccess(token: string): Promise<boolean> {
  try {
    return !!token;
  } catch (error) {
    console.error("Token verification error:", error);
    return false;
  }
}

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");

  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const hasAccess = await verifyUserHasStorageAccess(token);

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);

  // Map /storage/v1/bucket to /bucket
  let targetPath = url.pathname;
  if (targetPath.startsWith("/storage/v1/")) {
    targetPath = targetPath.replace("/storage/v1", "");
  }

  // Add schema parameter to the URL
  const searchParams = new URLSearchParams(url.search);
  searchParams.set("schema", STORAGE_SCHEMA);

  const targetUrl = `${STORAGE_URL}${targetPath}`;
  const newHeaders = new Headers(req.headers);

  // Replace the Authorization header with the Supabase token
  newHeaders.set("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);

  console.log(`Received ${req.method} request to ${req.url}`);
  console.log(`Forwarding to ${targetUrl} with method ${req.method}`);
  console.log(`Request headers:`, Object.fromEntries(newHeaders.entries()));

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: newHeaders,
      body: req.body,
    });

    if (req.method === "POST" || req.method === "PUT") {
      console.log("Request has body");
    }

    console.log(`Response status: ${response.status}`);

    // If we still get an error, let's log the response body for debugging
    if (response.status >= 400) {
      const responseText = await response.clone().text();
      console.error(`Error response: ${responseText}`);
    }

    return response;
  } catch (error) {
    console.error(`Error proxying request: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
