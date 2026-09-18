import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, SlidersHorizontal } from 'lucide-react';

import { useWallet } from '../contexts/WalletContext';
import { ledger } from '../generated/nexora/contract';
import type { Policy, Role } from '../types/domain';
import { EmptyState } from '../components/EmptyState';

function roleName(role: bigint): Role {
  switch (Number(role)) {
    case 1:
      return 'Client';
    case 2:
      return 'Contractor';
    case 3:
      return 'Verifier';
    case 4:
      return 'Orchestrator';
    default:
      return 'Client';
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function Policies() {
  const { ctx, connected } = useWallet();

  const [items, setItems] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!connected || !ctx) {
      setItems([]);
      return;
    }

    let cancelled = false;

    const loadPolicies = async () => {
      setLoading(true);
      setError(undefined);

      try {
        const contractAddress =
          import.meta.env.VITE_CONTRACT_ADDRESS;

        if (!contractAddress) {
          throw new Error(
            'Nexora contract address is not configured.',
          );
        }

        const contractState =
          await ctx.providers.publicDataProvider.queryContractState(
            contractAddress,
          );

        if (!contractState) {
          throw new Error(
            'No public contract state was found for the Nexora contract.',
          );
        }

        const state = ledger(contractState.data);
        const policies: Policy[] = [];

        for (const [id, value] of state.policies) {
          const policyId = bytesToHex(id);

          policies.push({
            id: policyId,
            name: `Policy ${policyId.slice(0, 8)}`,
            minReputation: Number(value.minReputation),
            minPayment: value.minPayment.toString(),
            maxPayment: value.maxPayment.toString(),
            requiredRole: roleName(value.requiredRole),
            verifierRequired: value.verifierRequired,
            approvalRequired: value.approvalRequired,
          });
        }

        if (!cancelled) {
          setItems(policies);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load policies.',
          );
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPolicies();

    return () => {
      cancelled = true;
    };
  }, [connected, ctx]);

  if (!connected) {
    return (
      <section>
        <h1>Policies</h1>
        <p>
          Connect your Midnight wallet to view policies.
        </p>
      </section>
    );
  }

  return (
    <>
      <div className="page-intro">
        <div>
          <p className="eyebrow">POLICY ENGINE</p>
          <h2>Settlement policies</h2>
          <p>
            Policies are enforced by Compact on the Midnight
            contract, not just checked by the UI.
          </p>
        </div>

        <Link
          className="button primary"
          to="/policies/new"
        >
          <Plus size={16} />
          Create policy
        </Link>
      </div>

      {loading && (
        <p>Loading policies from Midnight…</p>
      )}

      {error && (
        <p role="alert">
          Unable to load policies: {error}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="No policies found"
          description="No policies were found on the configured Nexora contract."
          action={
            <Link
              className="button ghost"
              to="/policies/new"
            >
              Create policy
            </Link>
          }
        />
      )}

      {items.length > 0 && (
        <div className="card-grid">
          {items.map((policy) => (
            <article
              className="policy-card"
              key={policy.id}
            >
              <div className="policy-top">
                <span className="role">
                  {policy.requiredRole}
                </span>

                <SlidersHorizontal size={17} />
              </div>

              <h3>{policy.name}</h3>

              <p className="mono">
                {policy.id}
              </p>

              <div className="policy-rules">
                <div>
                  <span>Min reputation</span>
                  <b>{policy.minReputation}</b>
                </div>

                <div>
                  <span>Payment range</span>
                  <b>
                    {policy.minPayment} – {policy.maxPayment}
                  </b>
                </div>

                <div>
                  <span>Verifier</span>
                  <b>
                    {policy.verifierRequired
                      ? 'Required'
                      : 'Optional'}
                  </b>
                </div>

                <div>
                  <span>Approval</span>
                  <b>
                    {policy.approvalRequired
                      ? 'Required'
                      : 'Optional'}
                  </b>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}