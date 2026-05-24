export interface CreateAgentInput {
  name: string;
  type: 'buyer' | 'seller' | 'both';
  ownerEmail: string;
}

export interface CreateListingInput {
  title: string;
  description?: string;
  type: 'physical_good' | 'digital_good' | 'event_ticket' | 'service' | 'other';
  priceAmount: number;
  currency?: string;
  quantityAvailable: number;
  attributes?: Record<string, any>;
  fulfillmentInstructions?: string | null;
}

export interface UpdateListingInput {
  title?: string;
  description?: string;
  status?: 'active' | 'paused' | 'sold_out' | 'deleted';
  priceAmount?: number;
  quantityAvailable?: number;
  attributes?: Record<string, any>;
  fulfillmentInstructions?: string | null;
}

export interface CreateCheckoutIntentInput {
  listingId: string;
  quantity: number;
  successUrl: string;
  cancelUrl: string;
}

export interface SearchFilters {
  type?: string;
  currency?: string;
  maxPriceAmount?: number;
  status?: string;
}

export class CommerceBackendClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(options: { baseUrl: string; apiKey?: string }) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers);

    if (this.apiKey) {
      headers.set('Authorization', `Bearer ${this.apiKey}`);
    }
    headers.set('Content-Type', 'application/json');

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = (data as any)?.error?.message || `HTTP error! status: ${response.status}`;
      const err = new Error(errorMsg) as any;
      err.code = (data as any)?.error?.code || 'UNKNOWN_ERROR';
      err.status = response.status;
      throw err;
    }

    return data as T;
  }

  async createAgent(input: CreateAgentInput) {
    return this.request<{ agent: any; apiKey: string }>('/v1/agents', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async me() {
    return this.request<{ agent: any }>('/v1/agents/me');
  }

  async createListing(input: CreateListingInput) {
    return this.request<{ listing: any }>('/v1/listings', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getListing(id: string) {
    return this.request<{ listing: any }>(`/v1/listings/${id}`);
  }

  async updateListing(id: string, input: UpdateListingInput) {
    return this.request<{ listing: any }>(`/v1/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async pauseListing(id: string) {
    return this.request<{ listing: any }>(`/v1/listings/${id}/pause`, {
      method: 'POST',
    });
  }

  async activateListing(id: string) {
    return this.request<{ listing: any }>(`/v1/listings/${id}/activate`, {
      method: 'POST',
    });
  }

  async search(query: string, filters?: SearchFilters, limit?: number) {
    return this.request<{ results: any[] }>('/v1/search', {
      method: 'POST',
      body: JSON.stringify({ query, filters, limit }),
    });
  }

  async createCheckoutIntent(input: CreateCheckoutIntentInput) {
    return this.request<{ checkoutIntent: any }>('/v1/checkout-intents', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getOrders(role?: 'buyer' | 'seller') {
    const path = role ? `/v1/orders?role=${role}` : '/v1/orders';
    return this.request<{ orders: any[] }>(path);
  }

  async getOrderDetails(id: string) {
    return this.request<{ order: any }>(`/v1/orders/${id}`);
  }

  async updateFulfillment(id: string, fulfillmentStatus: string, fulfillmentNote?: string | null) {
    return this.request<{ order: any }>(`/v1/orders/${id}/fulfillment`, {
      method: 'POST',
      body: JSON.stringify({ fulfillmentStatus, fulfillmentNote }),
    });
  }
}
