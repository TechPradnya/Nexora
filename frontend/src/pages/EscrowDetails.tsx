import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { useWallet } from '../contexts/WalletContext';
import { StatusBadge } from '../components/StatusBadge';
import { sha256Hex } from '../lib/commitment';
import { ledger } from '../generated/nexora/contract/index.js';

type OnChainEscrow = {
  id: string;
  client: string;
  contractor: string;
  verifier: string;
  policyId: string;
  amount: string;
  status: string;
  commitment?: string;
  approved: boolean;
};

function bytesToHex(value: unknown): string {
  if (value instanceof Uint8Array) {
    return Array.from(value)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  if (value instanceof ArrayBuffer) {
    return bytesToHex(new Uint8Array(value));
  }

  if (
    value &&
    typeof value === 'object' &&
    'buffer' in value
  ) {
    const buffer = (value as { buffer?: ArrayBuffer }).buffer;

    if (buffer instanceof ArrayBuffer) {
      return bytesToHex(new Uint8Array(buffer));
    }
  }

  return String(value);
}

function statusName(status: number): string {
  switch (status) {
    case 1:
      return 'Created';

    case 2:
      return 'Funded';

    case 3:
      return 'DeliverableSubmitted';

    case 4:
      return 'Approved';

    case 5:
      return 'Rejected';

    case 6:
      return 'Released';

    case 7:
      return 'Cancelled';

    default:
      return `Unknown (${status})`;
  }
}

export function EscrowDetails() {
  const { id } = useParams<{ id: string }>();

  const {
    ctx,
    connected,
    api: walletApi,
  } = useWallet();

  const [escrow, setEscrow] =
    useState<OnChainEscrow>();

  const [message, setMessage] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  async function load() {
    try {
      setMessage('');

      if (!ctx) {
        setEscrow(undefined);
        return;
      }

      const contractAddress =
        import.meta.env.VITE_CONTRACT_ADDRESS;

      if (!contractAddress) {
        throw new Error(
          'VITE_CONTRACT_ADDRESS is not configured.',
        );
      }

      const contractState =
        await ctx.providers.publicDataProvider.queryContractState(
          contractAddress,
        );

      if (!contractState) {
        setEscrow(undefined);
        return;
      }

      const state =
        ledger(contractState.data);

      let found:
        | OnChainEscrow
        | undefined;

      for (const [escrowId, item] of state.escrows) {
        const currentId =
          bytesToHex(escrowId);

        if (
          currentId.toLowerCase() !==
          String(id ?? '').toLowerCase()
        ) {
          continue;
        }

        found = {
          id: currentId,

          client: bytesToHex(
            item.client,
          ),

          contractor: bytesToHex(
            item.contractor,
          ),

          verifier: bytesToHex(
            item.verifier,
          ),

          policyId: bytesToHex(
            item.policyId,
          ),

          amount: item.amount.toString(),

          status: statusName(
            Number(item.status),
          ),

          commitment:
            bytesToHex(
              item.deliverableCommitment,
            ),

          approved:
            Boolean(item.approved),
        };

        break;
      }

      setEscrow(found);
    } catch (error: any) {
      console.error(
        'Failed to load escrow:',
        error,
      );

      setEscrow(undefined);

      setMessage(
        error?.message ??
          'Failed to load escrow from Midnight.',
      );
    }
  }

  useEffect(() => {
    if (connected && ctx) {
      load();
    }
  }, [id, connected, ctx]);

  async function requireWallet() {
    if (
      !connected ||
      !ctx ||
      !walletApi
    ) {
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
      const { ctx } =
        await requireWallet();

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
        error?.message ??
          'Funding transaction failed.',
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
      const { ctx } =
        await requireWallet();

      const commitment =
        await sha256Hex(
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
      const { ctx } =
        await requireWallet();

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
      const { ctx } =
        await requireWallet();

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
      const {
        ctx,
        walletApi,
      } = await requireWallet();

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
      const { ctx } =
        await requireWallet();

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

  if (!connected) {
    return (
      <div className="form-page">
        <div className="panel">
          <h2>
            Connect Midnight wallet
          </h2>

          <p>
            Connect your Midnight wallet to
            view the on-chain escrow details.
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

  if (!escrow) {
    return (
      <div className="form-page">
        <div className="panel">
          <h2>
            Escrow not found
          </h2>

          <p>
            The escrow could not be found in
            the configured Midnight contract.
          </p>

          {message && (
            <div className="alert">
              {message}
            </div>
          )}

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
            Contract-enforced escrow lifecycle
            for this settlement.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="policy-top">
          <StatusBadge
            status={escrow.status}
          />

          <span className="mono">
            {escrow.id}
          </span>
        </div>

        <div className="review-meta">
          <span>
            Amount
            <b>
              {escrow.amount} NXR
            </b>
          </span>

          <span>
            Policy
            <b>
              {escrow.policyId}
            </b>
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

        {escrow.commitment &&
          escrow.commitment !==
            'undefined' && (
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
          {escrow.status ===
            'Created' && (
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

          {escrow.status ===
            'Funded' && (
            <button
              className="button primary"
              disabled={busy}
              onClick={
                submitDeliverable
              }
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

          {escrow.status ===
            'Approved' && (
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

          {escrow.status ===
            'Rejected' && (
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