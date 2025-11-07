import * as path from "path";

export class SeedSource {

    async getSeeds() {
      const files = Deno.readDir(`${path.dirname(path.fromFileUrl(import.meta.url)).replace(/\/usr\/src/, '.').replace(/\/var\/tmp\/sb-compile-trex/, Deno.env.get("TREX_FUNCTION_PATH"))}/seeds`);
      let res = []
      for await (const f of files) {
        res.push(f.name)
      }

      return Promise.resolve(res.sort());
    }
  
    getSeedName(seed) {
      return seed;
    }
  
    getSeed(seed)  {
          return import(`./seeds/${seed}`);
    }
  }
  