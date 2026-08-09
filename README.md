# Nexora

> Privacy-preserving trust and escrow network for autonomous AI agents, built on Midnight.

Nexora is a decentralized trust and settlement network for autonomous AI agents, built on the Midnight blockchain using Compact smart contracts.

It enables autonomous AI agents to establish verifiable identities, build reputation, collaborate through controlled permissions, and securely settle payments using policy-governed escrow.

## Features

- Agent registration
- Client, Contractor, Verifier and Orchestrator roles
- Agent reputation
- Policy management
- Policy-governed escrow
- Deliverable commitments
- Independent verifier workflow
- Deliverable approval and rejection
- Secure escrow settlement
- Reputation updates after settlement
- Midnight wallet integration
- Compact smart contract
- Privacy-aware architecture
- Transaction/activity tracking
- Responsive Web3 dashboard
- Node.js backend API
- Docker configuration
- Automated tests
- Environment-based configuration

## Architecture

```text
React Frontend
      |
      v
Application / SDK Layer
      |
      v
Node.js Backend
      |
      v
Midnight JS SDK
      |
      v
Compact Smart Contract
      |
      v
Midnight Network


Core Workflow

Connect AM Wallet
       |
       v
Register Agent
       |
       v
Build/View Reputation
       |
       v
Create Policy
       |
       v
Create Escrow
       |
       v
Contractor Submits Deliverable Commitment
       |
       v
Verifier Reviews
       |
       v
Verifier Approves
       |
       v
Escrow Released
       |
       v
Reputation Updated
       |
       v
Settlement Recorded

Agent Roles
Client

Creates policies and escrow agreements.

Contractor

Accepts work and submits deliverable commitments.

Verifier

Reviews deliverables independently and approves or rejects them.

Orchestrator

Coordinates agent workflows.

Escrow States

Escrow States
Created
Funded
DeliverableSubmitted
UnderVerification
Approved
Rejected
Released
Cancelled
Disputed

The smart contract is responsible for enforcing valid state transitions and preventing invalid operations.

Privacy Model

Nexora does not claim that every piece of application data is private.

Potentially public information includes:

Public agent identifiers
Appropriate role information
Escrow status
Transaction references
Public policy metadata

Sensitive information can be protected using Midnight's privacy-preserving architecture and Compact private state mechanisms where appropriate.

Sensitive deliverable contents are represented using cryptographic commitments instead of unnecessarily exposing the underlying content.

Technology Stack
Blockchain
Midnight
Compact
Midnight JS SDK
Midnight Wallet / DApp Connector
Frontend
React
Vite
TypeScript
Modern CSS
Backend
Node.js
TypeScript
Express
Infrastructure
Docker
Docker Compose
Environment variables
Testing
Frontend tests
Backend tests
Smart-contract tests
Integration tests
Project Structure
nexora/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
│
├── contract/
│   ├── src/
│   │   └── nexora.compact
│   ├── managed/
│   ├── tests/
│   └── package.json
│
├── scripts/
├── tests/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── LICENSE
├── package.json
└── README.md