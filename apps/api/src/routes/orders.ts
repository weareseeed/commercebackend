import { FastifyInstance } from 'fastify';
import { UpdateFulfillmentSchema } from '@commercebackend/schemas';
import { OrdersService } from '../services/orders.service';
import { authenticateAgent } from '../plugins/auth';
import { AppError } from '../plugins/error-handler';

export async function orderRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticateAgent);

  fastify.get('/v1/orders', async (request, reply) => {
    const agent = request.agent!;
    const { role, limit: limitQuery, offset: offsetQuery } = request.query as {
      role?: 'buyer' | 'seller';
      limit?: string;
      offset?: string;
    };

    if (role && role !== 'buyer' && role !== 'seller') {
      throw new AppError('BAD_REQUEST', "Role must be either 'buyer' or 'seller'", 400);
    }

    if (role === 'seller' && agent.type !== 'seller' && agent.type !== 'both') {
      throw new AppError('FORBIDDEN', 'Only seller agents can view orders as seller', 403);
    }
    if (role === 'buyer' && agent.type !== 'buyer' && agent.type !== 'both') {
      throw new AppError('FORBIDDEN', 'Only buyer agents can view orders as buyer', 403);
    }

    // Default limit: 20, max limit: 100
    const rawLimit = limitQuery ? parseInt(limitQuery, 10) : 20;
    const rawOffset = offsetQuery ? parseInt(offsetQuery, 10) : 0;

    const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

    const { orders, total } = await OrdersService.getOrders(agent.id, role, limit, offset);

    return {
      orders,
      pagination: {
        limit,
        offset,
        total,
      },
    };
  });

  fastify.get('/v1/orders/:id', async (request, reply) => {
    const agent = request.agent!;
    const { id } = request.params as { id: string };

    const order = await OrdersService.getOrderDetails(id, agent.id);
    return { order };
  });

  fastify.post('/v1/orders/:id/fulfillment', async (request, reply) => {
    const agent = request.agent!;
    const { id } = request.params as { id: string };

    if (agent.type !== 'seller' && agent.type !== 'both') {
      throw new AppError('FORBIDDEN', 'Only seller agents can update fulfillment', 403);
    }

    const input = UpdateFulfillmentSchema.parse(request.body);
    const order = await OrdersService.updateFulfillment(
      id,
      agent.id,
      input.fulfillmentStatus,
      input.fulfillmentNote
    );

    return {
      order: {
        id: order.id,
        fulfillmentStatus: order.fulfillmentStatus,
        fulfillmentNote: order.fulfillmentNote,
      },
    };
  });
}
