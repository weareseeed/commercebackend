import { prisma } from '@commercebackend/db';
import { CreateListingInput, UpdateListingInput } from '@commercebackend/schemas';
import { AppError } from '../plugins/error-handler';

export class ListingsService {
  static async createListing(sellerAgentId: string, input: CreateListingInput) {
    const listing = await prisma.listing.create({
      data: {
        sellerAgentId,
        title: input.title,
        description: input.description || '',
        type: input.type,
        status: input.quantityAvailable > 0 ? 'active' : 'sold_out',
        priceAmount: input.priceAmount,
        currency: input.currency || 'USD',
        quantityAvailable: input.quantityAvailable,
        attributes: input.attributes || {},
        fulfillmentInstructions: input.fulfillmentInstructions || null,
      },
    });

    return listing;
  }

  static async getListingById(id: string) {
    const listing = await prisma.listing.findUnique({
      where: { id },
    });
    if (!listing || listing.status === 'deleted') {
      throw new AppError('LISTING_NOT_FOUND', 'Listing not found', 404);
    }
    return listing;
  }

  static async updateListing(id: string, sellerAgentId: string, input: UpdateListingInput) {
    const listing = await this.getListingById(id);

    if (listing.sellerAgentId !== sellerAgentId) {
      throw new AppError('FORBIDDEN', 'You do not own this listing', 403);
    }

    let status = input.status ?? listing.status;
    if (input.quantityAvailable !== undefined) {
      if (input.quantityAvailable === 0) {
        status = 'sold_out';
      } else if (listing.status === 'sold_out' && input.quantityAvailable > 0) {
        status = 'active';
      }
    }

    const updatedListing = await prisma.listing.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        status,
        priceAmount: input.priceAmount,
        quantityAvailable: input.quantityAvailable,
        attributes: input.attributes,
        fulfillmentInstructions: input.fulfillmentInstructions,
      },
    });

    return updatedListing;
  }

  static async pauseListing(id: string, sellerAgentId: string) {
    const listing = await this.getListingById(id);

    if (listing.sellerAgentId !== sellerAgentId) {
      throw new AppError('FORBIDDEN', 'You do not own this listing', 403);
    }

    const updatedListing = await prisma.listing.update({
      where: { id },
      data: { status: 'paused' },
    });

    return updatedListing;
  }

  static async activateListing(id: string, sellerAgentId: string) {
    const listing = await this.getListingById(id);

    if (listing.sellerAgentId !== sellerAgentId) {
      throw new AppError('FORBIDDEN', 'You do not own this listing', 403);
    }

    if (listing.quantityAvailable <= 0) {
      throw new AppError('VALIDATION_ERROR', 'Cannot activate listing with zero inventory', 400);
    }

    const updatedListing = await prisma.listing.update({
      where: { id },
      data: { status: 'active' },
    });

    return updatedListing;
  }
}
