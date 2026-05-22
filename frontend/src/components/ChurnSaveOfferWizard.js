import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const STEPS = [
  { key: 'subscriber', label: 'Select Subscriber' },
  { key: 'offer',      label: 'Choose Offer' },
  { key: 'preview',    label: 'Preview Email' },
  { key: 'send',       label: 'Send' },
];

export default function ChurnSaveOfferWizard() {
  const [stepIdx, setStepIdx] = useState(0);

  // step 1
  const [subscribers, setSubscribers] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [subscriberId, setSubscriberId] = useState('');

  // step 2
  const [offerType, setOfferType] = useState('discount'); // discount | free_month | swap_box
  const [discountPct, setDiscountPct] = useState(20);
  const [freeMonths, setFreeMonths] = useState(1);
  const [swapBoxId, setSwapBoxId] = useState('');
  const [boxes, setBoxes] = useState([]);

  // step 3
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // result
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const subscriber = useMemo(
    () => subscribers.find((s) => String(s.id) === String(subscriberId)),
    [subscribers, subscriberId]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingSubs(true);
      try {
        // Pull a list of customers and treat lowest-LTV / churned status first as at-risk
        const r = await api.get('/api/customers?limit=50');
        const list = Array.isArray(r.data) ? r.data : (r.data?.data || []);
        const sorted = [...list].sort((a, b) => {
          const sA = (a.status || '').toLowerCase() === 'cancelled' || (a.status || '').toLowerCase() === 'churned' ? 0 : 1;
          const sB = (b.status || '').toLowerCase() === 'cancelled' || (b.status || '').toLowerCase() === 'churned' ? 0 : 1;
          if (sA !== sB) return sA - sB;
          return Number(a.lifetime_value || 0) - Number(b.lifetime_value || 0);
        });
        if (!cancelled) {
          setSubscribers(sorted);
          if (sorted.length) setSubscriberId(String(sorted[0].id));
        }
        try {
          const br = await api.get('/api/subscription-boxes?limit=30');
          const blist = Array.isArray(br.data) ? br.data : (br.data?.data || []);
          if (!cancelled) {
            setBoxes(blist);
            if (blist.length) setSwapBoxId(String(blist[0].id));
          }
        } catch (_) { /* boxes optional */ }
      } catch (err) {
        if (!cancelled) setError('Failed to load subscribers');
      } finally {
        if (!cancelled) setLoadingSubs(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // When entering preview, auto-generate subject/body if empty
  useEffect(() => {
    if (stepIdx !== 2) return;
    if (emailSubject && emailBody) return;
    const name = subscriber?.name || 'there';
    if (offerType === 'discount') {
      setEmailSubject(`A special ${discountPct}% off — just for you, ${name}`);
      setEmailBody(
        `Hi ${name},\n\nWe noticed you've been considering pausing your subscription. ` +
        `As a thank-you for being part of our community, we'd love to offer you ${discountPct}% off ` +
        `your next box.\n\nNo code needed — the discount is already attached to your account.\n\n` +
        `— The Curation Team`
      );
    } else if (offerType === 'free_month') {
      setEmailSubject(`On us: ${freeMonths} free month${freeMonths > 1 ? 's' : ''}, ${name}`);
      setEmailBody(
        `Hi ${name},\n\nWe value having you with us. Please accept ${freeMonths} free month${freeMonths > 1 ? 's' : ''} ` +
        `on the house. Your next billing will pause automatically.\n\n— The Curation Team`
      );
    } else {
      const box = boxes.find((b) => String(b.id) === String(swapBoxId));
      const boxName = box?.name || 'a curator-picked box';
      setEmailSubject(`Try something new, ${name}? Free swap to ${boxName}`);
      setEmailBody(
        `Hi ${name},\n\nIf your current box isn't quite right, we'll swap your next shipment for ` +
        `${boxName} at no extra cost. Reply YES and we'll handle the rest.\n\n— The Curation Team`
      );
    }
  }, [stepIdx, offerType, discountPct, freeMonths, swapBoxId, subscriber, boxes]); // eslint-disable-line

  const next = () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  const send = async () => {
    setSending(true);
    setError('');
    try {
      const payload = {
        subscriber_id: subscriberId ? Number(subscriberId) : null,
        subscriber_name: subscriber?.name,
        offer_type: offerType,
        discount_pct: offerType === 'discount' ? Number(discountPct) : null,
        free_months: offerType === 'free_month' ? Number(freeMonths) : null,
        swap_box_id: offerType === 'swap_box' ? Number(swapBoxId) : null,
        email_subject: emailSubject,
        email_body: emailBody,
      };
      const r = await api.post('/api/custom-views/save-offer', payload);
      setResult(r.data);
      setStepIdx(3);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to send offer');
    } finally {
      setSending(false);
    }
  };

  const restart = () => {
    setResult(null);
    setError('');
    setEmailSubject('');
    setEmailBody('');
    setStepIdx(0);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
          Churn Save-Offer Wizard
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
          Pick an at-risk subscriber, craft a save offer, preview the email, and log the send.
        </p>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => (
          <div key={s.key} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
            background: i === stepIdx ? '#111827' : (i < stepIdx ? '#10b981' : '#f3f4f6'),
            color: i === stepIdx ? '#fff' : (i < stepIdx ? '#fff' : '#374151'),
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: 999, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
              background: '#ffffff33', color: 'inherit', fontSize: 11,
            }}>{i + 1}</span>
            {s.label}
          </div>
        ))}
      </div>

      {/* Step content */}
      {stepIdx === 0 && (
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 6 }}>
            At-risk subscriber (sorted by churned / lowest LTV first)
          </label>
          <select
            value={subscriberId}
            onChange={(e) => setSubscriberId(e.target.value)}
            disabled={loadingSubs}
            style={inputStyle}
          >
            {loadingSubs && <option>Loading…</option>}
            {!loadingSubs && subscribers.length === 0 && <option value="">No subscribers</option>}
            {subscribers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} • {(s.status || 'active')} • LTV ${Number(s.lifetime_value || 0).toFixed(0)}
              </option>
            ))}
          </select>
        </div>
      )}

      {stepIdx === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'discount', label: 'Discount %' },
              { id: 'free_month', label: 'Free month' },
              { id: 'swap_box', label: 'Swap box' },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOfferType(o.id)}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13,
                  border: '1px solid', cursor: 'pointer',
                  borderColor: offerType === o.id ? '#111827' : '#d1d5db',
                  background: offerType === o.id ? '#111827' : '#fff',
                  color: offerType === o.id ? '#fff' : '#111827',
                }}
              >{o.label}</button>
            ))}
          </div>

          {offerType === 'discount' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#374151', maxWidth: 220 }}>
              Discount percent (1-50)
              <input
                type="number" min="1" max="50"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                style={inputStyle}
              />
            </label>
          )}
          {offerType === 'free_month' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#374151', maxWidth: 220 }}>
              Free months (1-3)
              <input
                type="number" min="1" max="3"
                value={freeMonths}
                onChange={(e) => setFreeMonths(e.target.value)}
                style={inputStyle}
              />
            </label>
          )}
          {offerType === 'swap_box' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#374151' }}>
              Swap to box
              <select value={swapBoxId} onChange={(e) => setSwapBoxId(e.target.value)} style={inputStyle}>
                {boxes.length === 0 && <option value="">No boxes available</option>}
                {boxes.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {stepIdx === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 12, color: '#374151' }}>
            Subject
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              style={{ ...inputStyle, marginTop: 4, width: '100%' }}
            />
          </label>
          <label style={{ fontSize: 12, color: '#374151' }}>
            Body
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={8}
              style={{ ...inputStyle, marginTop: 4, width: '100%', fontFamily: 'inherit', resize: 'vertical' }}
            />
          </label>
          <div style={{
            background: '#f9fafb', border: '1px dashed #e5e7eb', padding: 12, borderRadius: 8,
            fontSize: 12, color: '#374151',
          }}>
            To: <strong>{subscriber?.email || subscriber?.name || 'subscriber'}</strong> &nbsp;•&nbsp;
            Offer: <strong>{offerType}</strong>
          </div>
        </div>
      )}

      {stepIdx === 3 && result && (
        <div style={{
          padding: 16, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8,
          color: '#065f46', fontSize: 13,
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Offer sent.</div>
          <div>Offer ID: <strong>#{result.offer_id}</strong></div>
          <div>Sent at: <strong>{new Date(result.sent_at).toLocaleString()}</strong></div>
          <div>Expected save rate: <strong>{result.expected_save_rate_pct}%</strong></div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12, padding: 10, background: '#fef2f2', color: '#991b1b',
          border: '1px solid #fecaca', borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Footer nav */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <button
          type="button"
          onClick={stepIdx === 3 ? restart : back}
          disabled={stepIdx === 0}
          style={{
            padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13,
            border: '1px solid #d1d5db', background: '#fff', color: '#111827',
            cursor: stepIdx === 0 ? 'not-allowed' : 'pointer', opacity: stepIdx === 0 ? 0.5 : 1,
          }}
        >
          {stepIdx === 3 ? 'Start another' : 'Back'}
        </button>
        {stepIdx < 2 && (
          <button
            type="button"
            onClick={next}
            disabled={!subscriberId}
            style={primaryBtn}
          >Next</button>
        )}
        {stepIdx === 2 && (
          <button
            type="button"
            onClick={send}
            disabled={sending || !emailSubject || !emailBody}
            style={{ ...primaryBtn, opacity: sending ? 0.7 : 1 }}
          >{sending ? 'Sending…' : 'Send offer'}</button>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 13,
  background: '#fff',
  color: '#111827',
};

const primaryBtn = {
  background: '#111827', color: '#fff', border: 0, padding: '10px 16px',
  borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
};
