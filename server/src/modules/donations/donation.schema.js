import { z } from 'zod';

const ALLOWED_UNITS = ['portions', 'meals', 'kg', 'boxes', 'servings', 'packets'];
const FOOD_TYPES = ['VEGETARIAN', 'NON_VEGETARIAN', 'OTHER'];
const DONATION_STATUSES = ['OPEN', 'CLAIMED', 'COMPLETED', 'EXPIRED', 'CANCELLED'];

export const createDonationSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(120, 'Title must not exceed 120 characters'),
    description: z
      .string()
      .trim()
      .min(5, 'Description must be at least 5 characters')
      .max(1000, 'Description must not exceed 1000 characters'),
    quantity: z
      .number({ invalid_type_error: 'Quantity must be a positive number' })
      .positive('Quantity must be greater than zero')
      .max(100000, 'Quantity is too large'),
    unit: z.enum(ALLOWED_UNITS, {
      errorMap: () => ({
        message: `Unit must be one of: ${ALLOWED_UNITS.join(', ')}`
      })
    }),
    foodType: z.enum(FOOD_TYPES, {
      errorMap: () => ({
        message: `Food type must be one of: ${FOOD_TYPES.join(', ')}`
      })
    }),
    preparedAt: z
      .string()
      .datetime({ message: 'preparedAt must be a valid ISO datetime string' }),
    consumeBy: z
      .string()
      .datetime({ message: 'consumeBy must be a valid ISO datetime string' }),
    pickupDeadline: z
      .string()
      .datetime({ message: 'pickupDeadline must be a valid ISO datetime string' })
  })
  .refine(
    (data) => {
      const prep = new Date(data.preparedAt).getTime();
      const consume = new Date(data.consumeBy).getTime();
      return consume > prep;
    },
    {
      message: 'consumeBy deadline must be later than preparedAt time',
      path: ['consumeBy']
    }
  )
  .refine(
    (data) => {
      const pickup = new Date(data.pickupDeadline).getTime();
      const consume = new Date(data.consumeBy).getTime();
      return pickup <= consume;
    },
    {
      message: 'pickupDeadline cannot be later than consumeBy deadline',
      path: ['pickupDeadline']
    }
  )
  .refine(
    (data) => {
      const prep = new Date(data.preparedAt).getTime();
      const pickup = new Date(data.pickupDeadline).getTime();
      return pickup >= prep;
    },
    {
      message: 'pickupDeadline cannot be earlier than preparedAt time',
      path: ['pickupDeadline']
    }
  );

export const updateDonationSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().min(5).max(1000).optional(),
    quantity: z.number().positive().max(100000).optional(),
    unit: z.enum(ALLOWED_UNITS).optional(),
    foodType: z.enum(FOOD_TYPES).optional(),
    preparedAt: z.string().datetime().optional(),
    consumeBy: z.string().datetime().optional(),
    pickupDeadline: z.string().datetime().optional()
  })
  .refine(
    (data) => {
      if (data.preparedAt && data.consumeBy) {
        return new Date(data.consumeBy) > new Date(data.preparedAt);
      }
      return true;
    },
    {
      message: 'consumeBy must be later than preparedAt',
      path: ['consumeBy']
    }
  )
  .refine(
    (data) => {
      if (data.pickupDeadline && data.consumeBy) {
        return new Date(data.pickupDeadline) <= new Date(data.consumeBy);
      }
      return true;
    },
    {
      message: 'pickupDeadline must be on or before consumeBy',
      path: ['pickupDeadline']
    }
  );

export const verifyPickupSchema = z.object({
  code: z
    .string({ required_error: 'Verification code is required' })
    .trim()
    .min(4, 'Verification code must be at least 4 characters')
    .max(12, 'Verification code must not exceed 12 characters')
});

export const cancelDonationSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(250, 'Cancellation reason must not exceed 250 characters')
    .optional()
});

export const queryDonationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(DONATION_STATUSES).optional(),
  locality: z.string().trim().optional(),
  foodType: z.enum(FOOD_TYPES).optional(),
  my: z.enum(['true', 'false']).optional(),
  claims: z.enum(['true', 'false']).optional(),
  activeOnly: z.enum(['true', 'false']).optional()
});
