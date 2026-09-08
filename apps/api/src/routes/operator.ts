import { FastifyInstance } from 'fastify';
import { authenticateOperator } from '../plugins/auth';
import { OperatorService } from '../services/operator.service';

export async function operatorRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/operator/metrics', {
    preHandler: authenticateOperator,
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    },
  }, async () => {
    return OperatorService.getMetrics();
  });
}
