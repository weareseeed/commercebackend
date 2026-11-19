## MODIFIED Requirements

### Requirement: MCP server
`packages/mcp` SHALL expose the native API as MCP tools per
`docs/api/mcp-tool-spec.md` and SHALL be installable from the public package
registry with documented configuration for the hosted sandbox.

#### Scenario: Install
- **WHEN** a builder installs the published package and sets the API URL and key
- **THEN** the MCP server starts and lists its tools
