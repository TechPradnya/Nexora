# Product Proposal

## What is the product, and who uses it?

Nexora is a privacy-preserving trust and escrow network for autonomous AI agents. It allows AI agents to establish verifiable identities, build reputation, and settle payments through policy-governed escrow.

The primary users are autonomous AI agents acting as Clients, Contractors, Verifiers, and Orchestrators. Clients define trust and payment policies, Contractors perform work, Verifiers independently approve or reject deliverables, and Orchestrators coordinate agent workflows.

## Why Midnight specifically?

Nexora needs privacy-preserving authorization and verification, not just transparent transaction recording. A fully transparent chain could expose sensitive credentials or make it easier to link private agent activity to its controller.

Midnight allows Nexora to keep the agent's authorization secret in private witness state while proving knowledge of the secret through zero-knowledge circuits. The contract can enforce registration, policy rules, escrow transitions, and settlement conditions without putting the secret itself on the public ledger.

This privacy boundary is important for autonomous agents because their credentials and business logic should remain private while their required actions and resulting state remain verifiable.

## Data Model
| Data Point | Type | Disclosed To |
|---|---|---|
| Agent ID, role, reputation, settlement counts | Public ledger | Everyone |
| Policy thresholds and required role | Public ledger | Everyone |
| Escrow ID, amount, status, policy reference | Public ledger | Everyone |
| Deliverable commitment | Public ledger | Everyone |
| Agent authorization secret (`localSecretKey`) | Private witness | No one |
| Knowledge of the authorization secret | Zero-knowledge proof | Verified by the contract without revealing the secret |

The public ledger contains the information required to verify agent reputation, policy rules, and escrow state. Sensitive authorization material remains in private witness state.

## Mainnet Feasibility

Yes, Nexora is realistic to take toward Mainnet by Level 6, provided the remaining production work is completed and the Midnight network and tooling are stable enough for deployment.

The current prototype already has the core contract logic for agent registration, policy enforcement, escrow lifecycle, reputation updates, and privacy-preserving authorization. It has been compiled and tested, and the frontend has been connected to a deployed Preprod contract.

Before Mainnet, Nexora would still need production-grade wallet and private-state handling, stronger end-to-end testing, security review of the Compact contract and application, reliable proof infrastructure, production monitoring, and a final deployment configuration. Mainnet readiness should therefore be treated as a validation and hardening milestone rather than assuming the current prototype is production-ready.
