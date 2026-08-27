import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Agent = { nameCommitment: Uint8Array;
                      role: bigint;
                      reputation: bigint;
                      successful: bigint;
                      unsuccessful: bigint
                    };

export type Policy = { nameCommitment: Uint8Array;
                       minReputation: bigint;
                       minPayment: bigint;
                       maxPayment: bigint;
                       requiredRole: bigint;
                       verifierRequired: boolean;
                       approvalRequired: boolean
                     };

export type Escrow = { client: Uint8Array;
                       contractor: Uint8Array;
                       verifier: Uint8Array;
                       policyId: Uint8Array;
                       amount: bigint;
                       status: bigint;
                       deliverableCommitment: Uint8Array;
                       approved: boolean
                     };

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  registerAgent(context: __compactRuntime.CircuitContext<PS>,
                agentId_0: Uint8Array,
                nameCommitment_0: Uint8Array,
                role_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  updateReputation(context: __compactRuntime.CircuitContext<PS>,
                   escrowId_0: Uint8Array,
                   success_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  createPolicy(context: __compactRuntime.CircuitContext<PS>,
               policyId_0: Uint8Array,
               nameCommitment_0: Uint8Array,
               minReputation_0: bigint,
               minPayment_0: bigint,
               maxPayment_0: bigint,
               requiredRole_0: bigint,
               verifierRequired_0: boolean,
               approvalRequired_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  createEscrow(context: __compactRuntime.CircuitContext<PS>,
               escrowId_0: Uint8Array,
               clientId_0: Uint8Array,
               contractor_0: Uint8Array,
               verifier_0: Uint8Array,
               policyId_0: Uint8Array,
               amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  fundEscrow(context: __compactRuntime.CircuitContext<PS>,
             escrowId_0: Uint8Array,
             amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  submitDeliverable(context: __compactRuntime.CircuitContext<PS>,
                    escrowId_0: Uint8Array,
                    commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  approveDeliverable(context: __compactRuntime.CircuitContext<PS>,
                     escrowId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  rejectDeliverable(context: __compactRuntime.CircuitContext<PS>,
                    escrowId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  releaseEscrow(context: __compactRuntime.CircuitContext<PS>,
                escrowId_0: Uint8Array,
                contractorAddress_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  cancelEscrow(context: __compactRuntime.CircuitContext<PS>,
               escrowId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  getAgent(context: __compactRuntime.CircuitContext<PS>, agentId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Agent>;
  getPolicy(context: __compactRuntime.CircuitContext<PS>, policyId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Policy>;
  getEscrow(context: __compactRuntime.CircuitContext<PS>, escrowId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Escrow>;
}

export type ProvableCircuits<PS> = {
  registerAgent(context: __compactRuntime.CircuitContext<PS>,
                agentId_0: Uint8Array,
                nameCommitment_0: Uint8Array,
                role_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  updateReputation(context: __compactRuntime.CircuitContext<PS>,
                   escrowId_0: Uint8Array,
                   success_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  createPolicy(context: __compactRuntime.CircuitContext<PS>,
               policyId_0: Uint8Array,
               nameCommitment_0: Uint8Array,
               minReputation_0: bigint,
               minPayment_0: bigint,
               maxPayment_0: bigint,
               requiredRole_0: bigint,
               verifierRequired_0: boolean,
               approvalRequired_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  createEscrow(context: __compactRuntime.CircuitContext<PS>,
               escrowId_0: Uint8Array,
               clientId_0: Uint8Array,
               contractor_0: Uint8Array,
               verifier_0: Uint8Array,
               policyId_0: Uint8Array,
               amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  fundEscrow(context: __compactRuntime.CircuitContext<PS>,
             escrowId_0: Uint8Array,
             amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  submitDeliverable(context: __compactRuntime.CircuitContext<PS>,
                    escrowId_0: Uint8Array,
                    commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  approveDeliverable(context: __compactRuntime.CircuitContext<PS>,
                     escrowId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  rejectDeliverable(context: __compactRuntime.CircuitContext<PS>,
                    escrowId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  releaseEscrow(context: __compactRuntime.CircuitContext<PS>,
                escrowId_0: Uint8Array,
                contractorAddress_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  cancelEscrow(context: __compactRuntime.CircuitContext<PS>,
               escrowId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  getAgent(context: __compactRuntime.CircuitContext<PS>, agentId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Agent>;
  getPolicy(context: __compactRuntime.CircuitContext<PS>, policyId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Policy>;
  getEscrow(context: __compactRuntime.CircuitContext<PS>, escrowId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Escrow>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  registerAgent(context: __compactRuntime.CircuitContext<PS>,
                agentId_0: Uint8Array,
                nameCommitment_0: Uint8Array,
                role_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  updateReputation(context: __compactRuntime.CircuitContext<PS>,
                   escrowId_0: Uint8Array,
                   success_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  createPolicy(context: __compactRuntime.CircuitContext<PS>,
               policyId_0: Uint8Array,
               nameCommitment_0: Uint8Array,
               minReputation_0: bigint,
               minPayment_0: bigint,
               maxPayment_0: bigint,
               requiredRole_0: bigint,
               verifierRequired_0: boolean,
               approvalRequired_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  createEscrow(context: __compactRuntime.CircuitContext<PS>,
               escrowId_0: Uint8Array,
               clientId_0: Uint8Array,
               contractor_0: Uint8Array,
               verifier_0: Uint8Array,
               policyId_0: Uint8Array,
               amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  fundEscrow(context: __compactRuntime.CircuitContext<PS>,
             escrowId_0: Uint8Array,
             amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  submitDeliverable(context: __compactRuntime.CircuitContext<PS>,
                    escrowId_0: Uint8Array,
                    commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  approveDeliverable(context: __compactRuntime.CircuitContext<PS>,
                     escrowId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  rejectDeliverable(context: __compactRuntime.CircuitContext<PS>,
                    escrowId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  releaseEscrow(context: __compactRuntime.CircuitContext<PS>,
                escrowId_0: Uint8Array,
                contractorAddress_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  cancelEscrow(context: __compactRuntime.CircuitContext<PS>,
               escrowId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  getAgent(context: __compactRuntime.CircuitContext<PS>, agentId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Agent>;
  getPolicy(context: __compactRuntime.CircuitContext<PS>, policyId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Policy>;
  getEscrow(context: __compactRuntime.CircuitContext<PS>, escrowId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Escrow>;
}

export type Ledger = {
  agents: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Agent;
    [Symbol.iterator](): Iterator<[Uint8Array, Agent]>
  };
  agentAuth: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  policies: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Policy;
    [Symbol.iterator](): Iterator<[Uint8Array, Policy]>
  };
  escrows: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Escrow;
    [Symbol.iterator](): Iterator<[Uint8Array, Escrow]>
  };
  escrowAuth: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  readonly agentCount: bigint;
  readonly policyCount: bigint;
  readonly escrowCount: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
