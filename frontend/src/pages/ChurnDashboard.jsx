import React, { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const RISK_COLORS = {
  high: { bg: '#fef2f2', text: '#991b1b', badge: '#ef4444' },
  medium: { bg: '#fffbeb', text: '#92400e', badge: '#f59e0b' },
  low: { bg: '#f0fdf4', text: '#065f46', badge: '#10b981' }
};

export default function ChurnDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const token = localStorage.getItem('token');

  const runChurnAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/ai/churn-risk`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Analysis failed');
      setData(json.result?.details || json.result);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const customers = data?.customers || [];
  const filtered = filter === 'all' ? customers : customers.filter(c => c.churn_risk === filter);
  const highRisk = customers.filter(c => c.churn_risk === 'high').length;
  const midRisk = customers.filter(c => c.churn_risk === 'medium').length;

  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Churn Risk Dashboard</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>AI identifies at-risk subscribers and recommends retention actions</p>

      <button
        onClick={runChurnAnalysis}
        disabled={loading}
        style={{
          background: loading ? '#9ca3af' : '#ef4444', color: '#fff',
          border: 'none', borderRadius: '8px', padding: '12px 24px',
          cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '1rem',
          marginBottom: '2rem'
        }}
      >
        {loading ? 'Analyzing churn risk...' : 'Run AI Churn Analysis'}
      </button>

      {error && <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</div>}

      {data && (
        <div>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>{highRisk}</div>
              <div style={{ color: '#991b1b', fontWeight: 600 }}>High Risk</div>
            </div>
            <div style={{ background: '#fffbeb', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{midRisk}</div>
              <div style={{ color: '#92400e', fontWeight: 600 }}>Medium Risk</div>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>
                {data.estimated_revenue_at_risk ? `$${Number(data.estimated_revenue_at_risk).toLocaleString()}` : 'N/A'}
              </div>
              <div style={{ color: '#6b7280', fontWeight: 600 }}>Revenue at Risk</div>
            </div>
          </div>

          {/* Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {['all', 'high', 'medium', 'low'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 16px', borderRadius: '20px', border: 'none',
                  background: filter === f ? '#111827' : '#f3f4f6',
                  color: filter === f ? '#fff' : '#374151',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  textTransform: 'capitalize'
                }}
              >{f === 'all' ? 'All Customers' : `${f} Risk`}</button>
            ))}
          </div>

          {/* Customer List */}
          {filtered.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No customers match this filter.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {filtered.map((customer, i) => {
                const colors = RISK_COLORS[customer.churn_risk] || RISK_COLORS.medium;
                return (
                  <div key={i} style={{
                    background: colors.bg, borderRadius: '10px',
                    padding: '1.25rem', border: `1px solid ${colors.badge}30`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{customer.name || `Customer #${customer.id}`}</div>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>ID: {customer.id}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {customer.churn_probability !== undefined && (
                          <span style={{ fontSize: '0.85rem', color: colors.text, fontWeight: 600 }}>
                            {Math.round(customer.churn_probability * 100)}% churn prob.
                          </span>
                        )}
                        <span style={{
                          background: colors.badge, color: '#fff',
                          padding: '2px 10px', borderRadius: '12px',
                          fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'
                        }}>
                          {customer.churn_risk} RISK
                        </span>
                      </div>
                    </div>

                    {customer.retention_action && (
                      <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: colors.text, marginBottom: '0.25rem' }}>
                          RETENTION ACTION
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#374151' }}>{customer.retention_action}</div>
                      </div>
                    )}

                    {customer.reasons && customer.reasons.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {customer.reasons.map((r, j) => (
                          <span key={j} style={{
                            background: 'rgba(255,255,255,0.7)', padding: '2px 8px',
                            borderRadius: '12px', fontSize: '0.78rem', color: colors.text
                          }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
