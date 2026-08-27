import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { api } from '../lib/api';
import { useWallet } from '../contexts/WalletContext';
import type { Escrow } from '../types/domain';
import { StatusBadge } from '../components/StatusBadge';
import { sha256Hex } from '../lib/commitment';

export function EscrowDetails() {
  const { id } = useParams<{ id: string }>();
  const { ctx, connected, api: walletApi } = useWallet();

  const [escrow, setEscrow] = useState<Escrow>();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const result = await api.escrows();

      const found = result.items.find(
        item => item.id === id,
      );

      setEscrow(found);
    } catch {
      setEscrow(undefined);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function requireWallet() {
    if (!connected || !ctx || !walletApi) {
      throw new Error(
        'Connect the Midnight wallet and configure the deployed contract first.',
      );
    }

    return {
      ctx,
      walletApi,
    };
  }

  async function fund() {
    if (!escrow) return;

    setBusy(true);
    setMessage('');

    try {
      const { ctx } = await requireWallet();

      await ctx.contract.callTx.fundEscrow(
        escrow.id,
        BigInt(escrow.amount),
      );

      setMessage(
        'Escrow funding transaction submitted successfully.',
      );

      await load();
    } catch (error: any) {
      setMessage(
        error?.message ?? 'Funding transaction failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitDeliverable() {
    if (!escrow) return;

    setBusy(true);
    setMessage('');

    try {
      const { ctx } = await requireWallet();

      const commitment = await sha256Hex(
        `nexora:deliverable:${escrow.id}:${Date.now()}`,
      );

      await ctx.contract.callTx.submitDeliverable(
        escrow.id,
        commitment,
      );

      setMessage(
        `Deliverable commitment submitted: ${commitment}`,
      );

      await load();
    } catch (error: any) {
      setMessage(
        error?.message ??
          'Deliverable submission failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!escrow) return;

    setBusy(true);
    setMessage('');

    try {
      const { ctx } = await requireWallet();

      await ctx.contract.callTx.approveDeliverable(
        escrow.id,
      );

      setMessage(
        'Deliverable approval transaction submitted.',
      );

      await load();
    } catch (error: any) {
      setMessage(
        error?.message ??
          'Approval transaction failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!escrow) return;

    setBusy(true);
    setMessage('');

    try {
      const { ctx } = await requireWallet();

      await ctx.contract.callTx.rejectDeliverable(
        escrow.id,
      );

      setMessage(
        'Deliverable rejection transaction submitted.',
      );

      await load();
    } catch (error: any) {
      setMessage(
        error?.message ??
          'Rejection transaction failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function release() {
    if (!escrow) return;

    setBusy(true);
    setMessage('');

    try {
      const { ctx, walletApi } =
        await requireWallet();

      const {
        unshieldedAddress,
      } =
        await walletApi.getUnshieldedAddress();

      const {
        encodeUserAddress,
      } =
        await import(
          '@midnight-ntwrk/ledger-v8'
        );

      const addressBytes =
        encodeUserAddress(
          unshieldedAddress,
        );

      await ctx.contract.callTx.releaseEscrow(
        escrow.id,
        {
          bytes: addressBytes,
        },
      );

      setMessage(
        'Escrow release transaction submitted. NXR will be transferred to the contractor wallet address.',
      );

      await load();
    } catch (error: any) {
      setMessage(
        error?.message ??
          'Escrow release failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!escrow) return;

    setBusy(true);
    setMessage('');

    try {
      const { ctx } = await requireWallet();

      await ctx.contract.callTx.cancelEscrow(
        escrow.id,
      );

      setMessage(
        'Escrow cancellation transaction submitted.',
      );

      await load();
    } catch (error: any) {
      setMessage(
        error?.message ??
          'Escrow cancellation failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (!escrow) {
    return (
      <div className="form-page">
        <div className="panel">
          <h2>Escrow not found</h2>
          <p>
            The escrow is not available from the indexed
            backend data.
          </p>
          <Link
            className="button ghost"
            to="/escrows"
          >
            <ArrowLeft size={16} />
            Back to escrows
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-intro">
        <div>
          <Link
            className="button ghost"
            to="/escrows"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

          <p className="eyebrow">
            ESCROW DETAILS
          </p>

          <h2>
            Controlled settlement
          </h2>

          <p>
            Contract-enforced escrow lifecycle for
            this settlement.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="policy-top">
          <StatusBadge status={escrow.status} />

          <span className="mono">
            {escrow.id}
          </span>
        </div>

        <div className="review-meta">
          <span>
            Amount
            <b>{escrow.amount} NXR</b>
          </span>

          <span>
            Policy
            <b>{escrow.policyId}</b>
          </span>
        </div>

        <div className="review-meta">
          <span>
            Client
            <b className="mono">
              {escrow.client}
            </b>
          </span>

          <span>
            Contractor
            <b className="mono">
              {escrow.contractor}
            </b>
          </span>

          <span>
            Verifier
            <b className="mono">
              {escrow.verifier}
            </b>
          </span>
        </div>

        {escrow.commitment && (
          <div>
            <h3>
              Deliverable commitment
            </h3>

            <div className="commitment">
              {escrow.commitment}
            </div>
          </div>
        )}

        {message && (
          <div className="alert">
            {message}
          </div>
        )}

        <div className="review-actions">
          {escrow.status === 'Created' && (
            <>
              <button
                className="button primary"
                disabled={busy}
                onClick={fund}
              >
                {busy
                  ? 'Processing…'
                  : 'Fund escrow'}
              </button>

              <button
                className="button danger"
                disabled={busy}
                onClick={cancel}
              >
                Cancel
              </button>
            </>
          )}

          {escrow.status === 'Funded' && (
            <button
              className="button primary"
              disabled={busy}
              onClick={submitDeliverable}
            >
              {busy
                ? 'Submitting…'
                : 'Submit deliverable'}
            </button>
          )}

          {escrow.status ===
            'DeliverableSubmitted' && (
            <>
              <button
                className="button primary"
                disabled={busy}
                onClick={approve}
              >
                Approve deliverable
              </button>

              <button
                className="button danger"
                disabled={busy}
                onClick={reject}
              >
                Reject deliverable
              </button>
            </>
          )}

          {escrow.status === 'Approved' && (
            <button
              className="button primary"
              disabled={busy}
              onClick={release}
            >
              {busy
                ? 'Releasing…'
                : 'Release escrow'}
            </button>
          )}

          {escrow.status === 'Rejected' && (
            <button
              className="button danger"
              disabled={busy}
              onClick={cancel}
            >
              Cancel escrow
            </button>
          )}
        </div>
      </div>
    </>
  );
}
