import { ZodError } from 'zod';
import { ApiError } from './errorHandler.js';

/**
 * Validation Middleware using Zod
 * @param {Object} schema - Zod schema with optional body, query, params
 */
export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      // Validate body if schema exists
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }

      // Validate query if schema exists
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }

      // Validate params if schema exists
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        throw new ApiError(400, 'Validation Error', errors);
      }
      throw error;
    }
  };
};

