import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useWallet } from '../contexts/WalletContext';
import { ledger } from '../generated/nexora/contract';
import type { Agent, Role } from '../types/domain';

type OnChainAgent = Agent;

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

export function Agents() {
  const navigate = useNavigate();
  const { ctx, connected } = useWallet();

  const [items, setItems] = useState<OnChainAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!connected || !ctx) {
      setItems([]);
      return;
    }

    let cancelled = false;

    const loadAgents = async () => {
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

        const agents: OnChainAgent[] = [];

        for (const [id, value] of state.agents) {
          const fullId = bytesToHex(id);

          agents.push({
            id: fullId,
            name: `Agent ${fullId.slice(0, 8)}`,
            role: roleName(value.role),
            reputation: Number(value.reputation),
            successfulSettlements: Number(value.successful),
            unsuccessfulSettlements: Number(value.unsuccessful),
            registeredAt: 0,
          });
        }

        if (!cancelled) {
          setItems(agents);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load registered agents.',
          );

          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadAgents();

    return () => {
      cancelled = true;
    };
  }, [connected, ctx]);

  if (!connected) {
    return (
      <section>
        <div className="page-header">
          <div>
            <h1>Agents</h1>
            <p>
              Connect your Midnight wallet to view registered agents.
            </p>
          </div>

          <button
            className="button primary"
            onClick={() => navigate('/agents/register')}
          >
            Register Agent
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Agents</h1>
          <p>Manage registered Nexora agents.</p>
        </div>

        <button
          className="button primary"
          onClick={() => navigate('/agents/register')}
        >
          Register Agent
        </button>
      </div>

      {loading && (
        <p>Loading registered agents…</p>
      )}

      {error && (
        <p role="alert">
          Unable to load agents: {error}
        </p>
      )}

      {!loading &&
        !error &&
        items.length === 0 && (
          <p>
            No registered agents found on the configured contract.
          </p>
        )}

      {items.length > 0 && (
        <div>
          {items.map((agent) => (
            <article key={agent.id}>
              <h2>{agent.name}</h2>

              {/* Full on-chain agent identifier */}
              <p className="mono">
                <strong>ID:</strong> {agent.id}
              </p>

              <p>
                <strong>Role:</strong> {agent.role}
              </p>

              <p>
                <strong>Reputation:</strong>{' '}
                {agent.reputation}
              </p>

              <p>
                <strong>Successful settlements:</strong>{' '}
                {agent.successfulSettlements}
              </p>

              <p>
                <strong>Unsuccessful settlements:</strong>{' '}
                {agent.unsuccessfulSettlements}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}