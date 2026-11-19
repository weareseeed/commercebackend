# Protocol Adapters and MCP

## Requirements

### Requirement: ACP subset
The system SHALL provide an ACP product feed and checkout-session mapping for
the documented subset (`docs/api/protocol-acp.md`).

### Requirement: UCP mapping layer
The system SHALL provide CommerceBackend's own schema.org-inspired UCP mapping
(`/v1/protocols/ucp/*`) and SHALL NOT claim conformance to an external
standard.

### Requirement: MCP server
`packages/mcp` SHALL expose the native API as MCP tools per
`docs/api/mcp-tool-spec.md`. The package is private (unpublished).
