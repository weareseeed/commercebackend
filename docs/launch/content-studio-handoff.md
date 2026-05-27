# CommerceBackend Content Studio Handoff

**Status:** Ready for Content Studio polish and Builder staging prep. Do not publish without Seeed LLC approval.  
**Prepared:** 2026-05-27  
**Owner:** Seeed LLC  
**Operational maintainer:** Joshua / Seeed AI Operations

CommerceBackend is owned and maintained by Seeed LLC. Seeed LLC / Seeed.us is unrelated to Seeed Studio.

---

## Purpose

This handoff gives Content Studio one durable place to recover the current CommerceBackend launch package from the repo without depending on chat history, screenshots, or attached media.

Use it to:

- find the approved draft assets
- see what is ready for Builder staging
- see what still needs polish or approval
- avoid publishing boundaries mistakes

Do not treat this file as publication approval.

---

## Ready assets

| Asset | Path | Current use | Status |
| --- | --- | --- | --- |
| Official launch article package | `docs/launch/official-launch-article.md` | Main Builder-ready article for staging | Ready for Content Studio polish |
| Technical article draft | `docs/launch/technical-article-draft.md` | Longer technical explainer / dev audience article | Draft for review |
| LinkedIn launch package | `docs/launch/linkedin-launch-package.md` | Social copy variants and image direction | Ready for Content Studio polish |
| Public announcement copy | `docs/launch/public-announcement-copy.md` | Channel-specific snippets for approved future use | Draft for approval |
| Directory submission copy | `docs/launch/directory-submission-copy.md` | External directory forms / PR snippets | Draft for approval |
| Distribution plan | `docs/launch/phase-4-distribution-plan.md` | Channel order, gates, and launch posture | Draft plan for review |
| Agent promotion sprint | `docs/launch/agent-promotion-sprint.md` | Agent-native promotion path and proof stack | Draft working plan |
| Blog cover image | `docs/launch/assets/commercebackend-blog-cover.png` | Builder/blog hero image | Ready |
| LinkedIn square image | `docs/launch/assets/commercebackend-linkedin-square.png` | LinkedIn launch image | Ready |

---

## Recommended Content Studio order

1. Start with `docs/launch/official-launch-article.md`.
2. Keep the title, boundaries, and v0.2 limits intact.
3. Use `docs/launch/assets/commercebackend-blog-cover.png` as the default article image unless Website & Growth requests another crop.
4. Use `docs/launch/linkedin-launch-package.md` only after the article is polished enough to keep copy aligned.
5. Treat `docs/launch/technical-article-draft.md` as a second-pass technical asset, not the first publish candidate.

---

## Builder staging fields to preserve

For the official article package, preserve these unless Website & Growth requests a specific change:

- title: `CommerceBackend: An Open-Source Backend for Agent-First Commerce`
- handle: `commercebackend-agent-first-commerce`
- eyebrow: `Agent-First Commerce`
- author: `Seeed`
- image: `docs/launch/assets/commercebackend-blog-cover.png`
- imagePost: `docs/launch/assets/commercebackend-blog-cover.png`

If Builder requires different final media URLs, keep the same image asset and update only the final storage path.

---

## Non-negotiable content boundaries

Keep these statements intact across article, social, and directory variants:

- CommerceBackend is owned and maintained by **Seeed LLC**.
- Seeed LLC / Seeed.us is **unrelated to Seeed Studio**.
- CommerceBackend v0.2 is **not** a full marketplace operator.
- Do **not** imply these are shipped in v0.2:
  - seller payouts
  - refunds
  - disputes
  - tax calculation
  - shipping labels
  - merchant sync
  - human-first marketplace UI
- Do **not** add adoption, revenue, traffic, performance, or ROI claims unless measured and approved.
- Do **not** move draft copy into public channels without Rowland or Maria approval for the exact target and exact copy.

---

## Source-of-truth links to keep in copy

- Repository: `https://github.com/weareseeed/commercebackend`
- Website: `https://www.commercebackend.com`
- LLM context: `https://www.commercebackend.com/llms.txt`
- Full LLM context: `https://www.commercebackend.com/llms-full.txt`
- Agent Skill Kit: `https://github.com/weareseeed/commercebackend/tree/master/agent-skill-kit`
- Native API docs: `https://github.com/weareseeed/commercebackend/blob/master/docs/api/native-api.md`

---

## Open polish tasks for Content Studio

- tighten wording only if meaning stays the same
- improve rhythm and readability for blog publication
- keep H2 structure answer-first and technical
- preserve the capability table and FAQ block
- preserve explicit v0.2 limits
- keep a practical CTA instead of a hype CTA

Avoid:

- generic AI buzzwords
- vague category claims without proof
- converting the article into a feature dump
- adding public-launch dates unless approved

---

## Approval gates

### Can do now
- polish article copy
- prep Builder staging draft
- prep internal review copy
- prep social variants for review

### Cannot do without explicit approval
- publish blog post
- publish LinkedIn post
- submit Product Hunt or directory entries
- post to Hacker News, Reddit, Slack communities, or Discord communities
- announce launch externally from Seeed or founder accounts

---

## Suggested handoff note

Use this internal note when passing work forward:

```text
CommerceBackend launch package is staged in-repo under docs/launch/. Start with official-launch-article.md and use commercebackend-blog-cover.png as the default hero asset. Keep the v0.2 limits and Seeed LLC ownership language intact. No public publishing or external submission without Rowland/Maria approval for the exact copy and channel.
```
