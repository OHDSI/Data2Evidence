// Worker code that uses sloppy imports
// With unstableSloppyImports enabled, you can import .ts files without extensions

import { helper } from './utils';  // No .ts extension needed!

Deno.serve((_req) => {
  return new Response(`Hello! Helper says: ${helper()}`);
});
