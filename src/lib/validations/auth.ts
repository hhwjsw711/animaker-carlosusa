import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signUpSchema = z.object({
  name: z.string().min(1).trim(),
  email: z.string().email(),
  password: z.string().min(PASSWORD_MIN_LENGTH),
});

export const resetRequestSchema = z.object({
  email: z.string().email(),
});

export const resetVerificationSchema = z.object({
  code: z.string().min(1),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH),
  confirmPassword: z.string().min(1),
}).refine((data) => data.newPassword === data.confirmPassword, {
  path: ["confirmPassword"],
});

export const changeEmailSchema = z.object({
  currentPassword: z.string().min(1),
  newEmail: z.string().email(),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ResetRequestValues = z.infer<typeof resetRequestSchema>;
export type ResetVerificationValues = z.infer<typeof resetVerificationSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export type ChangeEmailValues = z.infer<typeof changeEmailSchema>;
