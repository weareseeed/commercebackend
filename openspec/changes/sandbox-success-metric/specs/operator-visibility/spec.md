## ADDED Requirements

### Requirement: Launch metric counters
`GET /v1/operator/metrics` SHALL expose the read-only counters required by the
maintainer-chosen Launch 1 metric and SHALL NOT expose personal data.

#### Scenario: Counters present
- **WHEN** an operator requests metrics
- **THEN** the chosen counters appear alongside the existing counts

#### Scenario: No personal data
- **WHEN** the counters are returned
- **THEN** they contain only aggregate numbers
