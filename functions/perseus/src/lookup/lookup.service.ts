import { Service } from "typedi";
import * as path from "path";
import { k } from "../db/knex.ts";
import { UserDefinedLookup } from "../types.ts";
@Service()
export class LookupService {
  private readonly logger = console;
  private readonly k = k;

  constructor() {}

  async getLookups(username: string, lookupType: string) {
    const dbLookups = await this.getLookupsFromDB(username);
    const directoryLookups = await this.getLookupsFromDirectory(lookupType);
    return [...dbLookups, ...directoryLookups];
  }

  async getLookupSQL(
    id: string | undefined,
    name: string | undefined,
    lookupType: string
  ) {
    if (id) {
      const lookup = await this.getLookupById(id);
      if (lookupType === "source_to_standard") {
        return lookup.source_to_standard;
      } else if (lookupType === "source_to_source") {
        return lookup.source_to_source;
      }
    } else {
      if (name?.includes("template")) {
        try {
          const lookup = await Deno.readFile(
            this.getRelativePath(`${name}.txt`)
          );

          return new TextDecoder("utf-8").decode(lookup);
        } catch (error) {
          throw new Error(`Invalid file: ${name}`);
        }
      } else {
        try {
          const lookup = await Deno.readFile(
            this.getRelativePath(`${lookupType}/${name}.txt`)
          );

          return new TextDecoder("utf-8").decode(lookup);
        } catch (error) {
          throw new Error(`Invalid file: ${name}`);
        }
      }
    }
  }

  private getRelativePath(
    relativePath: string,
    basePath: string = "model/lookups"
  ) {
    return `${path
      .dirname(path.fromFileUrl(import.meta.url).replace(/\/lookup/, ""))
      .replace(/\/usr\/src/, ".")
      .replace(
        /\/var\/tmp\/sb-compile-trex\/d2ef/,
        Deno.env.get("TREX_FUNCTION_PATH")
      )}/${basePath}/${relativePath}`;
  }

  private async getLookupsFromDirectory(
    lookupType: string
  ): Promise<Array<Pick<UserDefinedLookup, "id" | "name">>> {
    const files = await Deno.readDir(this.getRelativePath(lookupType));
    let lookups: Array<Pick<UserDefinedLookup, "id" | "name">> = [];
    for await (const f of files) {
      lookups.push({ id: null as any, name: f.name.replace(".txt", "") });
    }

    return lookups;
  }

  private async getLookupsFromDB(
    username: string
  ): Promise<Array<Pick<UserDefinedLookup, "id" | "name">>> {
    return this.k
      .select("id", "name")
      .table("user_defined_lookups")
      .where({ username: username });
  }

  private async getLookupById(id: string): Promise<UserDefinedLookup> {
    return this.k.table("user_defined_lookups").where({ id: id }).first();
  }
}
