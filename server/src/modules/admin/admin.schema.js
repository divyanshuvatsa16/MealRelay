import { z } from 'zod';

export const bootstrapSchema = z.object({
  secret: z.string({ required_error: 'Bootstrap secret is required' }).min(1, 'Bootstrap secret is required'),
  email: z.string({ required_error: 'Admin email is required' }).email('Valid email address required'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').optional()
});
