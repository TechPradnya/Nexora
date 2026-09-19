import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';

import { useWallet } from '../contexts/WalletContext';
import { ledger } from '../generated/nexora/contract';

type OnChainEscrow = {
  id: string;
  client: string;
  contractor: string;
  verifier: string;
  policyId: string;
  amount: string;
  status: number;
  deliverableCommitment: string;
  approved: boolean;
  createdAt: number;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function statusName(status: number): string {
  switch (status) {
    case 1:
      return 'Created';

    case 2:
      return 'Funded';

    case 3:
      return 'Submitted';

    case 4:
      return 'Approved';

    case 5:
      return 'Rejected';

    case 6:
      return 'Released';

    case 7:
      return 'Cancelled';

    default:
      return `Status ${status}`;
  }
}

export function Escrows() {
  const { ctx, connected } = useWallet();

  const [items, setItems] = useState<OnChainEscrow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!connected || !ctx) {
      setItems([]);
      return;
    }

    let cancelled = false;

    const loadEscrows = async () => {
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

        const escrows: OnChainEscrow[] = [];

        for (const [id, value] of state.escrows) {
          const escrowId = bytesToHex(id);

          escrows.push({
            id: escrowId,
            client: bytesToHex(value.client),
            contractor: bytesToHex(value.contractor),
            verifier: bytesToHex(value.verifier),
            policyId: bytesToHex(value.policyId),
            amount: value.amount.toString(),
            status: Number(value.status),
            deliverableCommitment: bytesToHex(
              value.deliverableCommitment,
            ),
            approved: Boolean(value.approved),
            createdAt: Date.now(),
          });
        }

        if (!cancelled) {
          setItems(escrows);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load escrow records.',
          );

          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadEscrows();

    return () => {
      cancelled = true;
    };
  }, [connected, ctx]);

  if (!connected) {
    return (
      <section>
        <div className="page-intro">
          <div>
            <p className="eyebrow">ESCROW CONTROL</p>
            <h2>Policy-governed settlements</h2>
            <p>
              Connect your Midnight wallet to view escrow records.
            </p>
          </div>

          <Link
            className="button primary"
            to="/escrows/new"
          >
            <Plus size={16} />
            Create escrow
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="page-intro">
        <div>
          <p className="eyebrow">ESCROW CONTROL</p>

          <h2>Policy-governed settlements</h2>

          <p>
            Every payment lifecycle is a state machine:
            created → funded → verified → released.
          </p>
        </div>

        <Link
          className="button primary"
          to="/escrows/new"
        >
          <Plus size={16} />
          Create escrow
        </Link>
      </div>

      {loading && (
        <p>Loading escrow records from Midnight…</p>
      )}

      {error && (
        <p role="alert">
          Unable to load escrows: {error}
        </p>
      )}

      {!loading &&
        !error &&
        items.length === 0 && (
          <div>
            <p>No escrows found on the configured contract.</p>

            <Link
              className="button ghost"
              to="/escrows/new"
            >
              Create escrow
            </Link>
          </div>
        )}

      {items.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Escrow</th>
                <th>Parties</th>
                <th>Policy</th>
                <th>Amount</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {items.map((escrow) => (
                <tr key={escrow.id}>
                  <td>
                    <b>
                      {escrow.id.slice(0, 16)}…
                    </b>

                    <small>
                      On-chain escrow
                    </small>
                  </td>

                  <td>
                    <small>
                      Client {escrow.client.slice(0, 8)}…
                    </small>

                    <small>
                      Contractor{' '}
                      {escrow.contractor.slice(0, 8)}…
                    </small>

                    <small>
                      Verifier{' '}
                      {escrow.verifier.slice(0, 8)}…
                    </small>
                  </td>

                  <td className="mono">
                    {escrow.policyId.slice(0, 10)}…
                  </td>

                  <td>
                    <b>{escrow.amount}</b> NXR
                  </td>

                  <td>
                    {statusName(escrow.status)}
                  </td>

                  <td>
                    <Link
                      to={`/escrows/${escrow.id}`}
                      className="icon-button"
                      aria-label={`Open escrow ${escrow.id}`}
                    >
                      <ArrowRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}