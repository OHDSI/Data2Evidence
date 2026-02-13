function handler(req: Request): Response {
  const url = new URL(req.url);

  if (url.pathname === "/") {
    return new Response("Hello, World!");
  }

  if (url.pathname === "/calculator") {
    return new Response("Calculator route");
  }

  return new Response("Not Found", { status: 404 });
}

Deno.serve(handler);
