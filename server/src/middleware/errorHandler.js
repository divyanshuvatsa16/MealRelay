import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { Prisma } from '@prisma/client';

export function errorHandler(err, req, res, next) {
  // JSON parse error (SyntaxError from express.json())
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Malformed JSON in request body',
        code: 'INVALID_JSON'
      }
    });
  }

  // Zod validation error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));

    return res.status(400).json({
      success: false,
      error: {
        message: 'Request validation failed',
        code: 'VALIDATION_ERROR',
        details: formattedErrors
      }
    });
  }

  // Custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.name,
        details: err.details || undefined
      }
    });
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
      return res.status(409).json({
        success: false,
        error: {
          message: `A record with this ${target} already exists.`,
          code: 'UNIQUE_CONSTRAINT_VIOLATION'
        }
      });
    }

    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Requested record was not found.',
          code: 'NOT_FOUND'
        }
      });
    }

    return res.status(400).json({
      success: false,
      error: {
        message: 'Database operation failed.',
        code: 'DATABASE_ERROR'
      }
    });
  }

  // Generic internal server error
  console.error('Unhandled Server Error:', err.message);

  return res.status(500).json({
    success: false,
    error: {
      message: 'An internal server error occurred.',
      code: 'INTERNAL_SERVER_ERROR'
    }
  });
}
