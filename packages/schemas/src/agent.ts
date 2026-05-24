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

export const GetAgentResponseSchema = z.object({
  agent: AgentResponseSchema,
});

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type CreateAgentResponse = z.infer<typeof CreateAgentResponseSchema>;
export type GetAgentResponse = z.infer<typeof GetAgentResponseSchema>;
