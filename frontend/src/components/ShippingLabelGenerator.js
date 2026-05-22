import React, { useEffect, useState } from 'react';
import api from '../services/api';

const CARRIERS = ['USPS', 'UPS', 'FedEx'];
const SERVICE_TIERS = {
  USPS: ['Priority', 'Priority Express', 'Ground Advantage'],
  UPS: ['Ground', '2nd Day Air', 'Next Day Air'],
  FedEx: ['Home Delivery', 'Express Saver', 'Priority Overnight'],
};

export default function ShippingLabelGenerator() {
  const [subscribers, setSubscribers] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [subscriberId, setSubscriberId] = useState('');
  const [carrier, setCarrier] = useState('USPS');
  const [service, setService] = useState('Priority');
  const [weight, setWeight] = useState(24);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [lastTracking, setLastTracking] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingSubs(true);
      try {
        const r = await api.get('/api/customers?limit=50');
        if (!cancelled) {
          const list = Array.isArray(r.data) ? r.data : (r.data?.data || []);
          setSubscribers(list);
          if (list.length) setSubscriberId(String(list[0].id));
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load subscribers');
      } finally {
        if (!cancelled) setLoadingSubs(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Keep service in sync when carrier changes
  useEffect(() => {
    const tiers = SERVICE_TIERS[carrier] || [];
    if (tiers.length && !tiers.includes(service)) setService(tiers[0]);
  }, [carrier]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    setGenerating(true);
    setError('');
    setPdfUrl('');
    try {
      const sub = subscribers.find((s) => String(s.id) === String(subscriberId));
      const resp = await api.post(
        '/api/custom-views/shipping-label',
        {
          subscriber_id: subscriberId ? Number(subscriberId) : null,
          subscriber_name: sub?.name,
          carrier,
          service,
          weight_oz: Number(weight) || 24,
        },
        { responseType: 'blob' }
      );
      // Extract a tracking number hint from filename header (best effort)
      const cd = resp.headers['content-disposition'] || '';
      const m = cd.match(/filename="([^"]+)"/);
      setLastTracking(m ? m[1] : '');
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to generate label');
    } finally {
      setGenerating(false);
    }
  };

  const tiers = SERVICE_TIERS[carrier] || [];

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
          Shipping Label Generator
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
          Print a 4&times;6 carrier label for any subscriber on demand.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#374151' }}>
          Subscriber
          <select
            value={subscriberId}
            onChange={(e) => setSubscriberId(e.target.value)}
            disabled={loadingSubs}
            style={inputStyle}
          >
            {loadingSubs && <option>Loading…</option>}
            {!loadingSubs && subscribers.length === 0 && <option value="">No subscribers</option>}
            {subscribers.map((s) => (
              <option key={s.id} value={s.id}>{s.name} (#{s.id})</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#374151' }}>
          Carrier
          <select value={carrier} onChange={(e) => setCarrier(e.target.value)} style={inputStyle}>
            {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#374151' }}>
          Service Tier
          <select value={service} onChange={(e) => setService(e.target.value)} style={inputStyle}>
            {tiers.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#374151' }}>
          Weight (oz)
          <input
            type="number"
            min="1"
            max="600"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            style={inputStyle}
          />
        </label>
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={generate}
          disabled={generating || !subscriberId}
          style={{
            background: '#111827', color: '#fff', border: 0, padding: '10px 16px',
            borderRadius: 8, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.7 : 1,
          }}
        >
          {generating ? 'Generating…' : 'Generate Label'}
        </button>
        {pdfUrl && (
          <a
            href={pdfUrl}
            download={`label-${carrier}-${Date.now()}.pdf`}
            style={{ color: '#2563eb', fontSize: 13, textDecoration: 'underline' }}
          >
            Download PDF
          </a>
        )}
        {lastTracking && (
          <span style={{ fontSize: 12, color: '#6b7280' }}>File: {lastTracking}</span>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: 10, background: '#fef2f2', color: '#991b1b',
          border: '1px solid #fecaca', borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {pdfUrl && (
        <div style={{ marginTop: 16 }}>
          <object data={pdfUrl} type="application/pdf" width="100%" height="460">
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              PDF preview not supported here.{' '}
              <a href={pdfUrl} target="_blank" rel="noreferrer">Open the label</a>.
            </p>
          </object>
        </div>
      )}
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
