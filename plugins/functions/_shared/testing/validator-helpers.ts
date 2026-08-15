import { validationResult } from "express-validator";

type Chain = { run: (req: unknown) => Promise<unknown> };

/**
 * Run one or more express-validator chains against a mock request and return
 * the collected error messages (empty array means the input validated).
 */
export async function runValidators(
  chains: Chain | Chain[],
  req: unknown,
): Promise<string[]> {
  const list = Array.isArray(chains) ? chains : [chains];
  for (const chain of list) {
    await chain.run(req);
  }
  return validationResult(req as never)
    .array()
    .map((e) => e.msg as string);
}
