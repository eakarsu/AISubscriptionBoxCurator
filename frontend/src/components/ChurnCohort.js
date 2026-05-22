import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

// Heatmap-style cohort retention table built on recharts ScatterChart.
// Each dot is a (cohort x month-offset) cell; size + color encode retention %.
function retentionColor(pct) {
  if (pct == null) return '#e5e7eb';
  // Gradient from red (low) -> amber -> green (high)
  if (pct >= 80) return '#065f46';
  if (pct >= 65) return '#10b981';
  if (pct >= 50) return '#84cc16';
  if (pct >= 35) return '#f59e0b';
  if (pct >= 20) return '#f97316';
  return '#dc2626';
}

export default function ChurnCohort({ data }) {
  if (!data || !data.cohorts || data.cohorts.length === 0) {
    return <div style={{ padding: 16, color: '#6b7280' }}>No cohort data available.</div>;
  }

  const { cohorts, months_axis } = data;

  // Build flat scatter dataset: { x: monthIndex, y: cohortIndex, z: retention }
  const points = [];
  cohorts.forEach((c, ci) => {
    c.retention.forEach((pct, mi) => {
      if (pct == null) return;
      points.push({
        x: mi,
        y: ci,
        z: pct,
        cohort: c.cohort,
        monthLabel: months_axis[mi],
        size: c.size,
        retention: pct,
      });
    });
  });

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
          Cohort Retention Heatmap
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
          Retention % by signup-month cohort across the following 12 months. Darker green = stickier cohort.
        </p>
      </div>

      <div style={{ width: '100%', height: 460, minWidth: 600 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={600} minHeight={460}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 70 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              type="number"
              dataKey="x"
              name="Month"
              domain={[-0.5, 11.5]}
              ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}
              tickFormatter={(v) => months_axis[v] || ''}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              label={{ value: 'Months Since Signup', position: 'insideBottom', offset: -10, fill: '#374151', fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Cohort"
              domain={[-0.5, cohorts.length - 0.5]}
              ticks={cohorts.map((_, i) => i)}
              tickFormatter={(v) => cohorts[v] ? cohorts[v].cohort : ''}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              reversed
            />
            <ZAxis type="number" dataKey="z" range={[120, 520]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const p = payload[0].payload;
                return (
                  <div style={{ background: '#111827', color: '#fff', padding: '8px 10px', borderRadius: 6, fontSize: 12 }}>
                    <div style={{ fontWeight: 600 }}>{p.cohort} cohort</div>
                    <div>{p.monthLabel} after signup</div>
                    <div>Retention: {p.retention}%</div>
                    <div style={{ color: '#9ca3af' }}>Cohort size: {p.size}</div>
                  </div>
                );
              }}
            />
            <Scatter data={points} shape="square">
              {points.map((entry, idx) => (
                <Cell key={`c-${idx}`} fill={retentionColor(entry.retention)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#6b7280' }}>Retention scale:</span>
        {[
          { label: '<20%', c: '#dc2626' },
          { label: '20-34%', c: '#f97316' },
          { label: '35-49%', c: '#f59e0b' },
          { label: '50-64%', c: '#84cc16' },
          { label: '65-79%', c: '#10b981' },
          { label: '80%+', c: '#065f46' },
        ].map((s) => (
          <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
            <span style={{ width: 12, height: 12, background: s.c, borderRadius: 2, display: 'inline-block' }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
