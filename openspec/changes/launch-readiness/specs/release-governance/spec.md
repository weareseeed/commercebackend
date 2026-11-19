## ADDED Requirements

### Requirement: Approval before external actions
The project SHALL require explicit Seeed approval before publishing a release
or tag, publishing packages, announcing publicly, changing DNS, hosting, or
repository settings, or enabling real-money processing.

#### Scenario: Automation prepares a release
- **WHEN** an agent or routine prepares release notes or package metadata
- **THEN** it does not tag, publish, or announce until a maintainer approves

### Requirement: Public claims match shipped behavior
Public documentation and discovery assets SHALL describe only behavior that is
implemented and SHALL mark planned capabilities as planned.

#### Scenario: Claims review
- **WHEN** an announcement is drafted
- **THEN** it is reviewed against the documented list of things not to claim
  before it is sent
