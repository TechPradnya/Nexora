export type Role='Client'|'Contractor'|'Verifier'|'Orchestrator';
export type Agent={id:string;name:string;role:Role;reputation:number;successfulSettlements:number;unsuccessfulSettlements:number;registeredAt:number};
export type Policy={id:string;name:string;minReputation:number;minPayment:string;maxPayment:string;requiredRole:Role;verifierRequired:boolean;approvalRequired:boolean};
export type Escrow={id:string;client:string;contractor:string;verifier:string;policyId:string;amount:string;status:string;commitment?:string;createdAt:number};
export type Activity={id:string;action:string;status:string;txHash?:string;timestamp:number};
