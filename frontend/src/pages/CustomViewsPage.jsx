import React, { useEffect, useState } from 'react';
import api from '../services/api';
import ChurnCohort from '../components/ChurnCohort';
import BoxAssemblyFlow from '../components/BoxAssemblyFlow';
import ShippingLabelGenerator from '../components/ShippingLabelGenerator';
import ChurnSaveOfferWizard from '../components/ChurnSaveOfferWizard';

export default function CustomViewsPage() {
  const [cohort, setCohort] = useState(null);
  const [assembly, setAssembly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [cRes, aRes] = await Promise.all([
          api.get('/api/custom-views/churn-cohort'),
          api.get('/api/custom-views/box-assembly'),
        ]);
        if (cancelled) return;
        setCohort(cRes.data);
        setAssembly(aRes.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || err.message || 'Failed to load custom views');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#111827' }}>
          Subscription Analytics
        </h1>
        <p style={{ color: '#6b7280', margin: '4px 0 0' }}>
          Bespoke views for subscription box curation: retention cohorts and fulfillment flow.
        </p>
      </header>

      {loading && (
        <div style={{ padding: 32, color: '#6b7280' }}>Loading custom views...</div>
      )}

      {error && (
        <div style={{
          padding: 12, background: '#fef2f2', color: '#991b1b',
          border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16
        }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: 'grid', gap: 20 }}>
          <ChurnCohort data={cohort} />
          <BoxAssemblyFlow data={assembly} />
          <ShippingLabelGenerator />
          <ChurnSaveOfferWizard />
        </div>
      )}
    </div>
  );
}
