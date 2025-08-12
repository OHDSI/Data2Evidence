import { z } from "zod";

const ConfigUpdateSchema = z.object({
  type: z.string().min(1),
  value: z.string(),
});

type ConfigUpdateSchema = z.infer<typeof ConfigUpdateSchema>;

const TypesQuerySchema = z.object({
  types: z.string(),
});

type TypesQuerySchema = z.infer<typeof TypesQuerySchema>;

export {
  ConfigUpdateSchema,
  TypesQuerySchema,
  type ConfigUpdateSchema as ConfigUpdateDto,
  type TypesQuerySchema,
};
