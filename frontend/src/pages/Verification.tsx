import { useEffect, useState } from 'react';

import { api } from '../lib/api';
import type { Escrow } from '../types/domain';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { useWallet } from '../contexts/WalletContext';

export function Verification() {
  const [items, setItems] = useState<Escrow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api
      .escrows()
      .then(x =>
        setItems(
          x.items.filter(e =>
            ['DeliverableSubmitted', 'UnderVerification'].includes(
              e.status,
            ),
          ),
        ),
      )
      .catch(() => {
        setItems([]);
        setMessage('Unable to load the verification queue.');
      });
  }, []);

  const { ctx } = useWallet();

  async function act(id: string, approve: boolean) {
    if (!ctx) {
      setMessage(
        'Connect the Midnight wallet and configure the deployed contract first.',
      );
      return;
    }

    setBusyId(id);
    setMessage('');

    try {
      if (approve) {
        await ctx.contract.callTx.approveDeliverable(id);
      } else {
        await ctx.contract.callTx.rejectDeliverable(id);
      }

      setMessage(
        approve
          ? 'Deliverable approval transaction submitted successfully.'
          : 'Deliverable rejection transaction submitted successfully.',
      );

      const result = await api.escrows();

      setItems(
        result.items.filter(e =>
          ['DeliverableSubmitted', 'UnderVerification'].includes(
            e.status,
          ),
        ),
      );
    } catch (error: any) {
      setMessage(
        error?.message ??
          'Verification transaction failed. Please check the wallet and contract state.',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="page-intro">
        <div>
          <p className="eyebrow">INDEPENDENT REVIEW</p>

          <h2>Verifier queue</h2>

          <p>
            Only the assigned verifier should approve or reject a
            deliverable.
          </p>
        </div>
      </div>

      {message && (
        <div className="alert">
          {message}
        </div>
      )}

      {items.length ? (
        <div className="review-grid">
          {items.map(e => {
            const busy = busyId === e.id;

            return (
              <article
                className="review-card"
                key={e.id}
              >
                <div className="policy-top">
                  <StatusBadge status={e.status} />

                  <span className="mono">
                    {e.id.slice(0, 12)}…
                  </span>
                </div>

                <h3>Deliverable commitment</h3>

                <div className="commitment">
                  {e.commitment ?? 'Not yet indexed'}
                </div>

                <div className="review-meta">
                  <span>
                    Amount <b>{e.amount} NXR</b>
                  </span>

                  <span>
                    Policy <b>{e.policyId.slice(0, 10)}…</b>
                  </span>
                </div>

                <div className="review-actions">
                  <button
                    className="button primary"
                    onClick={() => act(e.id, true)}
                    disabled={busy}
                  >
                    {busy ? 'Processing…' : 'Approve'}
                  </button>

                  <button
                    className="button danger"
                    onClick={() => act(e.id, false)}
                    disabled={busy}
                  >
                    {busy ? 'Processing…' : 'Reject'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Verification queue is clear"
          description="Submitted deliverables will appear here when indexed from the contract."
        />
      )}
    </>
  );
}