import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address')
    .max(150),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),
  organizationName: z
    .string()
    .trim()
    .min(2, 'Organization name must be at least 2 characters')
    .max(150),
  organizationType: z.enum(['DONOR', 'NGO'], {
    errorMap: () => ({ message: "Organization type must be 'DONOR' or 'NGO'" })
  }),
  address: z
    .string()
    .trim()
    .min(5, 'Address must be at least 5 characters')
    .max(250),
  locality: z
    .string()
    .trim()
    .min(2, 'Locality must be at least 2 characters')
    .max(100)
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});
