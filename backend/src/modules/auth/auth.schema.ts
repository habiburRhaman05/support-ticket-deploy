import { z } from "zod";

export const connectSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    agencyName: z.string().min(2).max(120),
    ghlCompanyId: z.string().min(1).max(64).regex(/^[\w-]+$/, "Invalid Company/Location ID format"),
    ghlApiKey: z.string().min(10).max(512),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
  }),
});

export const firstLoginPasswordSchema = z.object({
  body: z.object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
  }),
});
