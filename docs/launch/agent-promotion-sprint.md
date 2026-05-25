# CommerceBackend Agent-Promotion Sprint

**Status:** Ready for execution after Rowland's 2026-05-25 approval to proceed  
**Owner:** Seeed LLC  
**Operator:** Joshua / Seeed AI Operations  
**Primary audience:** AI agent builders, coding-agent operators, agent-commerce researchers, marketplace API builders

CommerceBackend promotion should lead with agent-native proof: discovery files, a skill kit, runnable examples, prompt packs, and a clear roadmap for MCP/tool adapters. The goal is to make other agents able to find, understand, test, and recommend CommerceBackend without depending on a single social platform.

Seeed LLC / Seeed.us owns CommerceBackend. Seeed LLC is unrelated to Seeed Studio.

---

## Positioning

### One-line

> CommerceBackend is open-source commerce infrastructure for AI agents.

### Practical description

> CommerceBackend is an Apache-2.0, agent-first commerce backend from Seeed LLC. It gives AI agents structured APIs for identity, listings, search, offers, Stripe Checkout intents, webhook-confirmed orders, and fulfillment status.

### Sharp launch hook

> Shopify is for human storefronts. CommerceBackend is for agents that need commerce APIs.

Use the sharp hook only where conversational tone is acceptable. In formal directories, use the practical description.

---

## Agent-native proof stack

| Surface                | Status             | Public URL / path                                                  | Use in promotion                                                              |
| ---------------------- | ------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| LLM index              | Live               | `https://www.commercebackend.com/llms.txt`                         | Short machine-readable discovery link.                                        |
| Full LLM context       | Live               | `https://www.commercebackend.com/llms-full.txt`                    | Long context for agent crawlers and research agents.                          |
| Well-known metadata    | Live               | `https://www.commercebackend.com/.well-known/commercebackend.json` | Machine-readable product metadata.                                            |
| Repository agent guide | Live               | `AGENTS.md`                                                        | Safe contribution rules for coding agents.                                    |
| Agent Skill Kit        | Live               | `agent-skill-kit/`                                                 | Reusable skills for buyer, seller, coding, and evaluation agents.             |
| Prompt pack            | Live               | `prompts/`                                                         | Copy-paste prompts for buyer/seller/coding-agent use.                         |
| Buyer flow example     | Live               | `examples/agent-buyer-flow/`                                       | Runnable proof that agents can execute commerce flows.                        |
| MCP tool spec          | New in this sprint | `docs/api/mcp-tool-spec.md`                                        | Bridge from REST API to MCP clients without overclaiming shipped MCP runtime. |

---

## Execution sequence

### 1. Owned-surface cleanup

- Keep README and GitHub metadata focused on agent-first commerce.
- Add the MCP tool spec as a public roadmap/implementation contract.
- Add directory-ready copy so submissions are consistent and reviewable.
- Keep all claims bounded to v0.2 behavior.

### 2. Low-risk directory submissions

Submit only to directories where CommerceBackend clearly fits:

1. `llmstxt.site` / llms.txt registries: use the live `llms.txt` and `llms-full.txt` URLs.
2. Agent tooling directories: lead with Agent Skill Kit + buyer-flow example.
3. Open-source commerce/API lists: lead with Apache-2.0 + API-first marketplace primitives.
4. Awesome AI agent lists: submit only when infrastructure/tooling projects are accepted by the list.

Use `docs/launch/directory-submission-copy.md` for exact fields.

### 3. Agent-to-agent demo content

Create lightweight demos that other agents can run or explain:

- buyer agent searches listings, submits an offer, accepts checkout handoff
- seller agent creates listings and handles fulfillment status
- policy/safety agent reviews listings against Stripe-sensitive commerce categories
- coding agent adds a small endpoint or test while following `AGENTS.md`

### 4. MCP implementation path

Build an MCP server after this docs sprint so Claude Desktop, Cursor, and other MCP-aware clients can call CommerceBackend tools directly.

Recommended package name:

```text
@commercebackend/mcp
```

Initial tools:

- `commercebackend_register_agent`
- `commercebackend_search_listings`
- `commercebackend_get_listing`
- `commercebackend_create_listing`
- `commercebackend_create_offer`
- `commercebackend_accept_offer`
- `commercebackend_create_checkout_intent`
- `commercebackend_get_order`
- `commercebackend_update_fulfillment_status`

Do not advertise a shipped MCP server until the package exists, runs, and has tests.

---

## Approval gates

Rowland approved proceeding with the agent-promotion direction on 2026-05-25. This authorizes repo-local preparation and reasonable low-risk distribution work. Still pause before:

- posting from Rowland/Seeed social accounts
- launching Product Hunt or Show HN
- publishing on Seeed.us / Builder.io
- issuing press-style announcements
- creating production API keys for third parties
- making release tags tied to public announcement timing

---

## Measurement

Track signals that indicate agent/developer interest:

- GitHub stars, forks, watchers
- clone/referral traffic
- issues opened by builders or agents
- PRs that improve agent docs, examples, or adapters
- mentions of `llms.txt`, `AGENTS.md`, `.well-known/commercebackend.json`, or `agent-skill-kit/`
- inbound Seeed conversations that mention agent-commerce infrastructure

Avoid unsupported ROI or revenue claims.
