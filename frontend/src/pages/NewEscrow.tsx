import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useWallet } from '../contexts/WalletContext';
import { sha256Bytes, hexToBytes } from '../lib/commitment';

export function NewEscrow() {
  const nav = useNavigate();
  const { ctx, connected } = useWallet();

  const [f, setF] = useState({
    contractor: '',
    verifier: '',
    policy: '',
    amount: '10',
  });

  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (!connected || !ctx) {
      setMsg('Connect the Midnight wallet first.');
      return;
    }

    if (
      !f.contractor.trim() ||
      !f.verifier.trim() ||
      !f.policy.trim() ||
      Number(f.amount) <= 0
    ) {
      setMsg(
        'Contractor, verifier, policy and a positive amount are required.',
      );
      return;
    }

    setBusy(true);
    setMsg('');

    try {
      /*
       * All Bytes<32> contract arguments must be Uint8Array values.
       */

      const escrowId = await sha256Bytes(
        `nexora:escrow:${ctx.address}:${f.contractor}:${Date.now()}`,
      );

      const clientId = await sha256Bytes(
        `nexora:client:${ctx.address}`,
      );

      const contractorId = hexToBytes(
        f.contractor.trim().replace(/^0x/, ''),
      );

      const verifierId = hexToBytes(
        f.verifier.trim().replace(/^0x/, ''),
      );

      const policyId = hexToBytes(
        f.policy.trim().replace(/^0x/, ''),
      );

      if (contractorId.length !== 32) {
        throw new Error(
          'Contractor identifier must be exactly 32 bytes (64 hexadecimal characters).',
        );
      }

      if (verifierId.length !== 32) {
        throw new Error(
          'Verifier identifier must be exactly 32 bytes (64 hexadecimal characters).',
        );
      }

      if (policyId.length !== 32) {
        throw new Error(
          'Policy ID must be exactly 32 bytes (64 hexadecimal characters).',
        );
      }

      setMsg('Preparing escrow transaction…');

      await ctx.contract.callTx.createEscrow(
        escrowId,
        clientId,
        contractorId,
        verifierId,
        policyId,
        BigInt(f.amount),
      );

      setMsg(
        'Escrow transaction submitted successfully.',
      );

      setTimeout(() => nav('/escrows'), 1200);
    } catch (e: any) {
      console.error('[Nexora] Escrow creation failed:', e);

      setMsg(
        e?.message ??
          'Escrow creation failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-page">
      <div className="form-copy">
        <p className="eyebrow">ESCROW CREATION</p>

        <h2>Open a controlled settlement.</h2>

        <p>
          The contract checks the selected policy and parties
          before an escrow can enter its funded state.
        </p>

        <div className="privacy-card">
          <div>
            <b>Contract-enforced policy</b>

            <span>
              Contractor reputation, role, verifier
              independence and payment limits are checked
              directly by the Midnight contract.
            </span>
          </div>
        </div>
      </div>

      <form
        className="panel form"
        onSubmit={submit}
      >
        <label>
          Contractor identifier

          <input
            required
            value={f.contractor}
            onChange={(e) =>
              setF({
                ...f,
                contractor: e.target.value,
              })
            }
            placeholder="64-character hexadecimal agent ID"
          />
        </label>

        <label>
          Verifier identifier

          <input
            required
            value={f.verifier}
            onChange={(e) =>
              setF({
                ...f,
                verifier: e.target.value,
              })
            }
            placeholder="64-character hexadecimal verifier ID"
          />
        </label>

        <label>
          Policy ID

          <input
            required
            value={f.policy}
            onChange={(e) =>
              setF({
                ...f,
                policy: e.target.value,
              })
            }
            placeholder="64-character hexadecimal policy ID"
          />
        </label>

        <label>
          Settlement amount (NXR)

          <input
            type="number"
            min="1"
            required
            value={f.amount}
            onChange={(e) =>
              setF({
                ...f,
                amount: e.target.value,
              })
            }
          />
        </label>

        {msg && (
          <div
            className={
              msg.toLowerCase().includes('failed') ||
              msg.toLowerCase().includes('required') ||
              msg.toLowerCase().includes('must be')
                ? 'alert error'
                : 'alert success'
            }
          >
            {msg}
          </div>
        )}

        <button
          className="button primary full"
          disabled={busy}
        >
          {busy
            ? 'Submitting…'
            : 'Create escrow on Midnight'}
        </button>
      </form>
    </div>
  );
}