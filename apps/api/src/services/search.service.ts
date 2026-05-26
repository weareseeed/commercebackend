import { prisma, Listing } from '@commercebackend/db';
import { SearchFilters } from '@commercebackend/schemas';

export interface SearchResult {
  listing: Listing;
  matchReason: string;
  score: number;
}

export interface SearchProviderResult {
  results: SearchResult[];
  total: number;
}

export interface SearchProvider {
  search(query: string, filters: SearchFilters, limit: number, offset: number): Promise<SearchProviderResult>;
}

export class PostgresSearchProvider implements SearchProvider {
  async search(query: string, filters: SearchFilters, limit: number, offset: number): Promise<SearchProviderResult> {
    const status = filters.status ?? 'active';
    const type = filters.type;
    const currency = filters.currency;
    const maxPriceAmount = filters.maxPriceAmount;

    // Temporary safety cap for the in-memory scan until v0.3 moves search to DB-level indexing.
    const listings = await prisma.listing.findMany({
      where: {
        status,
        type,
        currency,
        priceAmount: maxPriceAmount ? { lte: maxPriceAmount } : undefined,
      },
      take: 1000,
    });

    if (!query) {
      const sliced = listings.slice(offset, offset + limit).map((listing) => ({
        listing,
        matchReason: 'Listing matches search filters.',
        score: 1.0,
      }));
      return { results: sliced, total: listings.length };
    }

    const queryKeywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((k) => k.length > 0);

    if (queryKeywords.length === 0) {
      const sliced = listings.slice(offset, offset + limit).map((listing) => ({
        listing,
        matchReason: 'Listing matches search filters.',
        score: 1.0,
      }));
      return { results: sliced, total: listings.length };
    }

    const results: SearchResult[] = [];

    for (const listing of listings) {
      const titleLower = listing.title.toLowerCase();
      const descLower = listing.description.toLowerCase();
      const attrsStr = JSON.stringify(listing.attributes).toLowerCase();

      const matchedKeywords: string[] = [];
      const matchedFields: string[] = [];

      let titleMatched = false;
      let descMatched = false;
      let attrsMatched = false;

      for (const kw of queryKeywords) {
        let keywordMatched = false;
        if (titleLower.includes(kw)) {
          keywordMatched = true;
          titleMatched = true;
        }
        if (descLower.includes(kw)) {
          keywordMatched = true;
          descMatched = true;
        }
        if (attrsStr.includes(kw)) {
          keywordMatched = true;
          attrsMatched = true;
        }

        if (keywordMatched) {
          matchedKeywords.push(kw);
        }
      }

      if (titleMatched) matchedFields.push('title');
      if (descMatched) matchedFields.push('description');
      if (attrsMatched) matchedFields.push('attributes');

      if (matchedKeywords.length > 0) {
        const score = Number((matchedKeywords.length / queryKeywords.length).toFixed(2));
        results.push({
          listing,
          matchReason: `Matched ${matchedFields.join('/')} for ${matchedKeywords.join(', ')}.`,
          score,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);

    const sliced = results.slice(offset, offset + limit);
    return { results: sliced, total: results.length };
  }
}

export class SearchService {
  private static provider: SearchProvider = new PostgresSearchProvider();

  static setProvider(customProvider: SearchProvider) {
    this.provider = customProvider;
  }

  static async searchListings(
    agentId: string,
    query: string,
    filters: SearchFilters,
    limit: number,
    offset: number
  ) {
    const { results, total } = await this.provider.search(query, filters, limit, offset);

    await prisma.agentQueryLog.create({
      data: {
        agentId,
        query,
        filters: filters as any,
        resultCount: total,
      },
    });

    return { results, total };
  }
}
