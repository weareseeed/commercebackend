# Protocol Adapters and MCP

## Purpose
Expose the native API through agent protocols and MCP tools.

## Requirements

### Requirement: ACP subset
The system SHALL provide an ACP product feed and checkout-session mapping for
the documented subset (`docs/api/protocol-acp.md`).

#### Scenario: Product feed
- **WHEN** a client requests `GET /v1/protocols/acp/product-feed`
- **THEN** listings are returned in the ACP feed mapping

### Requirement: UCP mapping layer
The system SHALL provide CommerceBackend's own schema.org-inspired UCP mapping
(`/v1/protocols/ucp/*`) and SHALL NOT claim conformance to an external
standard.

#### Scenario: Conformance wording
- **WHEN** documentation describes UCP
- **THEN** it states that this is not a conformance claim to an external standard

### Requirement: MCP server
`packages/mcp` SHALL expose the native API as MCP tools per
`docs/api/mcp-tool-spec.md`. The package is private (unpublished).

#### Scenario: Tool call
- **WHEN** an MCP client calls `commercebackend_search_listings`
- **THEN** the server calls `POST /v1/search` with the configured agent key

#### Scenario: Agent reputation parity
- **WHEN** an MCP client calls `commercebackend_get_agent` with an `agent_id`
- **THEN** the server calls `GET /v1/agents/:id` and returns that agent's
  public profile, including its read-only reputation signal
