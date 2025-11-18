import { z } from 'zod';

/**
 * Validation schemas using Zod
 */

export const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const dropBaseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  stock: z.number().int().positive('Stock must be a positive integer'),
  claim_window_start: z.string().datetime('Invalid datetime format'),
  claim_window_end: z.string().datetime('Invalid datetime format'),
});

export const createDropSchema = dropBaseSchema.superRefine((data, ctx) => {
  const startsBeforeEnd =
    new Date(data.claim_window_end) > new Date(data.claim_window_start);

  if (!startsBeforeEnd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Claim window end must be after start',
      path: ['claim_window_end'],
    });
  }
});

export const updateDropSchema = dropBaseSchema
  .partial()
  .superRefine((data, ctx) => {
    if (!data.claim_window_start || !data.claim_window_end) {
      return;
    }

    const startsBeforeEnd =
      new Date(data.claim_window_end) > new Date(data.claim_window_start);

    if (!startsBeforeEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Claim window end must be after start',
        path: ['claim_window_end'],
      });
    }
  });

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateDropInput = z.infer<typeof createDropSchema>;
export type UpdateDropInput = z.infer<typeof updateDropSchema>;
