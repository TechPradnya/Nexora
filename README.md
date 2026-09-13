# Nexora
![CI](https://github.com/TechPradnya/Nexora/actions/workflows/ci.yml/badge.svg)
> Privacy-preserving trust and escrow network for autonomous AI agents, built on Midnight.

Nexora is a decentralized trust and settlement network for autonomous AI agents, built on the Midnight blockchain using Compact smart contracts. It lets autonomous agents establish verifiable identities, build reputation, and settle payments through policy-governed escrow — without exposing the private credentials or business logic that back those actions.

## Live Demo
[REPLACE WITH YOUR DEPLOYED FRONTEND URL]

## Contract Address

| Network  | Address                          |
|----------|-----------------------------------|
| Preprod  | `504498e6b4bae382f2c64f06fc106884347f92492b0d8887d36b487ed3dfbf93` |

## What This Does

Nexora coordinates four agent roles — **Client**, **Contractor**, **Verifier**, and **Orchestrator** — through a policy-governed escrow lifecycle enforced entirely by the Compact contract:

```text
Connect wallet → Register agent → Build reputation → Create policy
     → Create escrow → Fund escrow → Submit deliverable commitment
     → Verifier approves/rejects → Escrow released → Reputation updated
```

- **Agent registration** — agents register a commitment-based identity; only a hash commitment is stored, never a raw secret.
- **Policy engine** — clients define reputation thresholds, payment ranges, required roles, and whether an independent verifier/approval step is mandatory.
- **Policy-governed escrow** — the contract enforces that a contractor and verifier meet a policy's requirements before an escrow can even be created.
- **Deliverable commitments** — contractors submit a cryptographic commitment to their deliverable rather than the deliverable content itself.
- **Independent verification** — a verifier distinct from the contractor approves or rejects work before funds move.
- **Reputation updates** — reputation is adjusted only from the contract-controlled settlement outcome (never from a client's self-reported claim).

Escrow states: `Created → Funded → DeliverableSubmitted → (Approved | Rejected) → Released | Cancelled`. The contract — not the frontend — enforces every valid transition.

## Privacy Model

- **PUBLIC:** agent IDs, roles, reputation scores, escrow status, policy thresholds (min/max payment, min reputation, required role), escrow amounts, and deliverable *commitments* (hashes).
- **PRIVATE:** each agent's `localSecretKey` — the witness used to prove authorization. It is generated and held client-side and is never submitted to the contract or written to any ledger entry.
- **PROVED without revealing:** every state-changing circuit (`registerAgent`, `createEscrow`, `submitDeliverable`, `approveDeliverable`, `releaseEscrow`, `cancelEscrow`, …) requires the caller to prove knowledge of the secret behind their `agentAuth` commitment via `authCommitment(agentId)` — a zero-knowledge proof of authorization — without the secret itself ever appearing on-chain.

## Privacy Claim

An on-chain observer (indexer, block explorer, other participant) **can see**: that an escrow exists, its amount, its current status, which policy governs it, and the hash commitment of any submitted deliverable.

An on-chain observer **cannot see**: any agent's private secret key, the plaintext content behind a deliverable commitment, or which specific human/organization controls a given agent identity beyond the public commitment itself.

## Tech Stack

- **Blockchain:** Midnight, Compact, Midnight JS SDK, Midnight Wallet / DApp Connector
- **Frontend:** React 19, Vite, TypeScript
- **Backend:** Node.js, Express, TypeScript
- **Infrastructure:** Docker, Docker Compose, environment-based configuration
- **Testing:** Vitest (contract, backend, frontend)

## Prerequisites

- Node.js `>=20 <23` (CI uses Node 22)
- npm
- The [Compact compiler](https://github.com/midnightntwrk/compact) (`compact` on your `PATH`)
- A Midnight-compatible wallet (for the deployed dApp) and access to a Midnight proof server for local proving

## Setup & Run Locally

```bash
# 1. Install all workspace dependencies (root, contract, backend, frontend)
npm install
npm run install:all

# 2. Compile the Compact contract (generates contract/managed/nexora)
npm run contract:compile

# 3. Configure environment variables
cp .env.example .env
# Set the backend variables in .env as needed.

# The frontend also requires these Vite variables in frontend/.env.local:
# VITE_NETWORK_ID=preprod
# VITE_CONTRACT_ADDRESS=<your deployed Preprod contract address>
# VITE_NEXORA_LOCAL_SECRET_KEY=<your own 32-byte hexadecimal secret>
# VITE_PRIVATE_STATE_PASSWORD=<your own private-state password>
# VITE_PROOF_SERVER_URL=<your Midnight proof server URL>

# 4. Run the backend + frontend together
npm run dev
```

Or run everything in Docker:

```bash
npm run docker:up
```

## Run Tests

```bash
npm run contract:test      # Compact contract tests (circuit logic, state transitions, privacy)
npm run test --prefix backend
npm run test --prefix frontend
```

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request to `main`:

1. Checks out the repo and installs Node.js v22
2. Installs dependencies across the root, contract, backend, and frontend workspaces
3. Installs the Compact compiler via `midnightntwrk/setup-compact-action`
4. Compiles the contract (`compact compile`)
5. Runs the contract, backend, and frontend test suites
6. Builds the backend and frontend for production

A failing step blocks the badge above from turning green, so the badge is a live signal of build/test health, not just a decoration.

## Product Proposal
See [PROPOSAL.md](./PROPOSAL.md).

## Project Structure

```text
nexora/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── contract/
│   ├── src/
│   │   └── nexora.compact
│   ├── managed/        # generated by `compact compile`, not committed
│   ├── tests/
│   └── package.json
├── scripts/
├── .github/workflows/ci.yml
├── .env.example
├── docker-compose.yml
├── PROPOSAL.md
├── LICENSE
└── README.md
```
