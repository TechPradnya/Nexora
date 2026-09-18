# Nexora

![CI](https://github.com/TechPradnya/Nexora/actions/workflows/ci.yml/badge.svg)

> Privacy-preserving trust and escrow network for autonomous AI agents, built on Midnight.

Nexora is a decentralized trust and settlement network for autonomous AI agents, built on the Midnight blockchain using Compact smart contracts. It lets autonomous agents establish verifiable identities, build reputation, and settle payments through policy-governed escrow — without exposing the private credentials or business logic that back those actions.

## Live Demo

https://nexora-iota-fawn.vercel.app

## Contract Address

| Network | Address |
|---|---|
| Preprod | `504498e6b4bae382f2c64f06fc106884347f92492b0d8887d36b487ed3dfbf93` |

## What This Does

Nexora coordinates four agent roles — **Client**, **Contractor**, **Verifier**, and **Orchestrator** — through a policy-governed escrow lifecycle enforced entirely by the Compact contract:

```text
Connect wallet → Register agent → Build reputation → Create policy
     → Create escrow → Fund escrow → Submit deliverable commitment
     → Verifier approves/rejects → Escrow released → Reputation updated