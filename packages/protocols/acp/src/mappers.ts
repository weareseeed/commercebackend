export interface ListingLike {
  id: string;
  title: string;
  description: string;
  priceAmount: number;
  currency: string;
}

export function mapListingToAcpCatalogItem(listing: ListingLike) {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: {
      amount: listing.priceAmount,
      currency: listing.currency,
    },
  };
}
