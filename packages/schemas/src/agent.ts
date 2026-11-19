import { z } from 'zod';

export const AgentTypeSchema = z.enum(['buyer', 'seller', 'both']);
export const AgentStatusSchema = z.enum(['active', 'disabled']);

export const CreateAgentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: AgentTypeSchema,
  ownerEmail: z.string().email('Invalid email address'),
});

export const AgentResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: AgentTypeSchema,
  ownerEmail: z.string(),
  status: AgentStatusSchema,
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const CreateAgentResponseSchema = z.object({
  agent: AgentResponseSchema,
  apiKey: z.string(),
});

// Per-role reputation counts (weekly backlog item 11), computed at request
// time from CheckoutIntent/Offer history — not stored on the Agent row.
// `*Rate` is null (not 0) when there's no decided history yet, since "no
// data" and "0% success" are different signals for a future purchase-policy
// trust check to consume.
const AgentReputationRoleCheckoutsSchema = z.object({
  completed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  completionRate: z.number().min(0).max(1).nullable(),
});

const AgentReputationRoleOffersSchema = z.object({
  accepted: z.number().int().nonnegative(),
  terminalTotal: z.number().int().nonnegative(),
  acceptanceRate: z.number().min(0).max(1).nullable(),
});

export const AgentReputationSchema = z.object({
  checkouts: z.object({
    asBuyer: AgentReputationRoleCheckoutsSchema,
    asSeller: AgentReputationRoleCheckoutsSchema,
  }),
  offers: z.object({
    asBuyer: AgentReputationRoleOffersSchema,
    asSeller: AgentReputationRoleOffersSchema,
  }),
});

export const AgentWithReputationSchema = AgentResponseSchema.extend({
  reputation: AgentReputationSchema,
});

export const GetAgentResponseSchema = z.object({
  agent: AgentWithReputationSchema,
});

// The public-facing shape returned for GET /v1/agents/:id — another agent's
// profile, so it omits ownerEmail (PII) that only the owning agent sees via
// GET /v1/agents/me.
export const PublicAgentResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: AgentTypeSchema,
  status: AgentStatusSchema,
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
  reputation: AgentReputationSchema,
});

export const GetAgentByIdResponseSchema = z.object({
  agent: PublicAgentResponseSchema,
});

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type CreateAgentResponse = z.infer<typeof CreateAgentResponseSchema>;
export type AgentReputation = z.infer<typeof AgentReputationSchema>;
export type AgentWithReputation = z.infer<typeof AgentWithReputationSchema>;
export type GetAgentResponse = z.infer<typeof GetAgentResponseSchema>;
export type PublicAgentResponse = z.infer<typeof PublicAgentResponseSchema>;
export type GetAgentByIdResponse = z.infer<typeof GetAgentByIdResponseSchema>;
