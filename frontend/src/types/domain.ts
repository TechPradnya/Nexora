export type Role = 'Client' | 'Contractor' | 'Verifier' | 'Orchestrator';
export type EscrowStatus = 'Created' | 'Funded' | 'DeliverableSubmitted' | 'UnderVerification' | 'Approved' | 'Rejected' | 'Released' | 'Cancelled' | 'Disputed';
export type TxState = 'Idle' | 'Connecting' | 'Preparing Transaction' | 'Awaiting Wallet Confirmation' | 'Submitting' | 'Confirming' | 'Success' | 'Failed';

export interface Agent { id: string; name: string; role: Role; reputation: number; successfulSettlements: number; unsuccessfulSettlements: number; registeredAt: number; }
export interface Policy { id: string; name: string; minReputation: number; minPayment: string; maxPayment: string; requiredRole: Role; verifierRequired: boolean; approvalRequired: boolean; }
export interface Escrow { id: string; client: string; contractor: string; verifier: string; policyId: string; amount: string; status: EscrowStatus; commitment?: string; createdAt: number; }
export interface Activity { id: string; action: string; status: string; txHash?: string; timestamp: number; }
