import { Hono } from "https://deno.land/x/hono@v4.0.0/mod.ts";

const app = new Hono();

// Root route
app.get("/", (c) => {
  console.log("GET / - Root route called");
  return c.text("Hello, World!");
});

// Calculator base route
app.get("/calculator", (c) => {
  console.log("GET /calculator - Calculator base route called");
  return c.text("Calculator route");
});

// Calculator add endpoint - adds two random numbers
app.get("/calculator/add", (c) => {
  console.log("GET /calculator/add - Add endpoint called");
  const num1 = Math.floor(Math.random() * 100);
  const num2 = Math.floor(Math.random() * 100);
  const result = num1 + num2;
  console.log(`Calculation: ${num1} + ${num2} = ${result}`);
  
  return c.json({ num1, num2, result });
});

// Calculator health check endpoint
app.get("/calculator/health", (c) => {
  console.log("GET /calculator/health - Health check called");
  return c.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString() 
  });
});

Deno.serve(app.fetch);
