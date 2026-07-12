import { z } from "zod";

export const rejectSchema = z.object({
  body: z.object({
    comment: z.string().max(1000).optional(),
  }),
});

export const decisionParamsSchema = z.object({
  body: z.object({}).passthrough().optional(),
  params: z.object({
    id: z.string().min(1),
  }),
});
