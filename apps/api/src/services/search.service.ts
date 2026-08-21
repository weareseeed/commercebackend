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

interface KeywordMatchRow extends Listing {
  matched_count: bigint | number;
  title_matched: boolean;
  desc_matched: boolean;
  attrs_matched: boolean;
  matched_keywords: string[];
  total_count: bigint | number;
}

function buildMatchReason(row: KeywordMatchRow): string {
  const matchedFields: string[] = [];
  if (row.title_matched) matchedFields.push('title');
  if (row.desc_matched) matchedFields.push('description');
  if (row.attrs_matched) matchedFields.push('attributes');
  return `Matched ${matchedFields.join('/')} for ${row.matched_keywords.join(', ')}.`;
}

function toListing(row: KeywordMatchRow): Listing {
  return {
    id: row.id,
    sellerAgentId: row.sellerAgentId,
    title: row.title,
    description: row.description,
    type: row.type,
    status: row.status,
    priceAmount: row.priceAmount,
    currency: row.currency,
    quantityAvailable: row.quantityAvailable,
    attributes: row.attributes,
    fulfillmentInstructions: row.fulfillmentInstructions,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PostgresSearchProvider implements SearchProvider {
  async search(query: string, filters: SearchFilters, limit: number, offset: number): Promise<SearchProviderResult> {
    const status = filters.status ?? 'active';
    const typeFilter = filters.type ?? null;
    const currencyFilter = filters.currency ?? null;
    const maxPriceFilter = filters.maxPriceAmount ?? null;

    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((k) => k.length > 0);

    if (keywords.length === 0) {
      const where = {
        status,
        type: filters.type,
        currency: filters.currency,
        priceAmount: maxPriceFilter ? { lte: maxPriceFilter } : undefined,
      };
      const [listings, total] = await Promise.all([
        prisma.listing.findMany({ where, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
        prisma.listing.count({ where }),
      ]);
      const results = listings.map((listing) => ({
        listing,
        matchReason: 'Listing matches search filters.',
        score: 1.0,
      }));
      return { results, total };
    }

    // Keyword matching, scoring, ranking, and pagination all run in Postgres
    // (GIN trigram indexes back the ILIKE lookups) instead of loading rows
    // into Node to scan and score in JS.
    const rows = await prisma.$queryRaw<KeywordMatchRow[]>`
      WITH p AS (
        SELECT
          ${keywords}::text[] AS keywords,
          ${status}::text AS status,
          ${typeFilter}::text AS type_filter,
          ${currencyFilter}::text AS currency_filter,
          ${maxPriceFilter}::int AS max_price
      ),
      keyword_hits AS (
        SELECT
          l.id,
          k.keyword,
          (l.title ILIKE '%' || k.keyword || '%') AS title_hit,
          (l.description ILIKE '%' || k.keyword || '%') AS desc_hit,
          (l.attributes::text ILIKE '%' || k.keyword || '%') AS attrs_hit
        FROM "Listing" l
        CROSS JOIN p
        CROSS JOIN LATERAL unnest(p.keywords) AS k(keyword)
        WHERE l.status::text = p.status
          AND (p.type_filter IS NULL OR l.type::text = p.type_filter)
          AND (p.currency_filter IS NULL OR l.currency = p.currency_filter)
          AND (p.max_price IS NULL OR l."priceAmount" <= p.max_price)
      ),
      matched AS (
        SELECT
          id,
          COUNT(*) FILTER (WHERE title_hit OR desc_hit OR attrs_hit) AS matched_count,
          BOOL_OR(title_hit) AS title_matched,
          BOOL_OR(desc_hit) AS desc_matched,
          BOOL_OR(attrs_hit) AS attrs_matched,
          ARRAY_AGG(keyword) FILTER (WHERE title_hit OR desc_hit OR attrs_hit) AS matched_keywords
        FROM keyword_hits
        GROUP BY id
        HAVING COUNT(*) FILTER (WHERE title_hit OR desc_hit OR attrs_hit) > 0
      )
      SELECT
        l.*,
        m.matched_count,
        m.title_matched,
        m.desc_matched,
        m.attrs_matched,
        m.matched_keywords,
        COUNT(*) OVER() AS total_count
      FROM matched m
      JOIN "Listing" l ON l.id = m.id
      ORDER BY m.matched_count DESC, l."createdAt" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const results = rows.map((row) => ({
      listing: toListing(row),
      matchReason: buildMatchReason(row),
      score: Number((Number(row.matched_count) / keywords.length).toFixed(2)),
    }));

    return { results, total };
  }
}

export class SearchService {
  private static provider: SearchProvider = new PostgresSearchProvider();

  static setProvider(customProvider: SearchProvider) {
    this.provider = customProvider;
  }

  static async searchListings(
    agentId: string | null,
    query: string,
    filters: SearchFilters,
    limit: number,
    offset: number
  ) {
    const { results, total } = await this.provider.search(query, filters, limit, offset);

    if (agentId) {
      await prisma.agentQueryLog.create({
        data: {
          agentId,
          query,
          filters: filters as any,
          resultCount: total,
        },
      });
    }

    return { results, total };
  }
}
