import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^(19|20|21)\d{2}-[01]\d-[0-3]\d$/, 'Must be an ISO date (YYYY-MM-DD)');

export const SkillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  taxonomyPath: z.array(z.string().min(1)).nonempty(),
  aliases: z.array(z.string().min(1)).default([]),
  proficiencyLevels: z.array(z.string().min(1)).nonempty(),
  lastValidated: isoDate
});

export type SkillRecord = z.infer<typeof SkillSchema>;

const rangeSchema = z
  .object({
    min: z.number().nonnegative(),
    mid: z.number().nonnegative(),
    max: z.number().nonnegative()
  })
  .refine((value) => value.min <= value.mid && value.mid <= value.max, {
    message: 'Expected min <= mid <= max'
  });

export const McpSchema = z.object({
  jobFamily: z.string().min(1),
  level: z.string().min(1),
  currency: z.string().min(1),
  baseRange: rangeSchema,
  geoModifier: z.record(z.number().positive()),
  skillLinks: z.array(z.string().min(1)).nonempty(),
  lastBenchmark: isoDate
});

export type McpRecord = z.infer<typeof McpSchema>;
