export interface ListingLike {
  id: string;
  title: string;
  description: string;
  priceAmount: number;
  currency: string;
}

export function mapListingToUcpProduct(listing: ListingLike) {
  return {
    id: listing.id,
    name: listing.title,
    description: listing.description,
    offers: [
      {
        price: listing.priceAmount,
        currency: listing.currency,
      },
    ],
  };
}
