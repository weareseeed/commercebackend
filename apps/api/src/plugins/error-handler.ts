import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function registerErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: any, request: FastifyRequest, reply: FastifyReply) => {
    if (
      process.env.NODE_ENV !== 'test' &&
      !(error instanceof AppError) &&
      !(error instanceof ZodError)
    ) {
      request.log.error(error);
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    if (error instanceof ZodError || error.name === 'ZodError') {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message:
            error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') ||
            error.message,
        },
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    }

    const isProd = process.env.NODE_ENV === 'production';
    return reply.status(error.statusCode || 500).send({
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: isProd ? 'An unexpected error occurred' : error.message,
      },
    });
  });
}
