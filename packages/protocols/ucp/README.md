# UCP Protocol Adapter

This package contains the mapping layer CommerceBackend calls "UCP" — its own
vendor-neutral, schema.org-inspired commerce mapping between the internal
listing/checkout-intent model and a lightweight product/order shape. It is
wired into three HTTP endpoints under `/v1/protocols/ucp/*`
(`apps/api/src/routes/protocol-ucp.ts`).

> [!IMPORTANT]
> "UCP" here is not a claim of conformance to any named, canonical external
> "Universal Commerce Protocol" standard — no such single external spec is
> referenced anywhere in this repository. It is CommerceBackend's own
> adapter, kept decoupled from the internal data model on purpose. See
> `docs/api/protocol-ucp.md` for the exact supported subset and explicit
> unsupported-fields list.
