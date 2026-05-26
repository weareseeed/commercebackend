import { prisma } from '@commercebackend/db';
import { CreatePurchasePolicyInput } from '@commercebackend/schemas';
import { AppError } from '../plugins/error-handler';

export class PurchasePoliciesService {
  static async createPurchasePolicy(buyerAgentId: string, input: CreatePurchasePolicyInput) {
    if (input.requireHumanApprovalAboveAmount < input.maxAutoApproveAmount) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Human approval threshold cannot be below max auto-approve amount',
        400
      );
    }

    return prisma.purchasePolicy.create({
      data: {
        buyerAgentId,
        name: input.name,
        enabled: input.enabled,
        maxAutoApproveAmount: input.maxAutoApproveAmount,
        currency: input.currency,
        allowedListingTypes: input.allowedListingTypes,
        allowedSellerAgentIds: input.allowedSellerAgentIds,
        requireHumanApprovalAboveAmount: input.requireHumanApprovalAboveAmount,
        requireHumanApprovalForOffers: input.requireHumanApprovalForOffers,
      },
    });
  }

  static async listPurchasePolicies(buyerAgentId: string) {
    return prisma.purchasePolicy.findMany({
      where: { buyerAgentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
