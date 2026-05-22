import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell,
} from 'recharts';

// Vertical fulfillment funnel: SKU pool -> Curated -> Packed -> Shipped -> Delivered.
// Implemented with a recharts horizontal-style BarChart laid out vertically (layout="vertical")
// so each stage is a row, length encoding volume — produces a funnel feel.
export default function BoxAssemblyFlow({ data }) {
  if (!data || !data.stages || data.stages.length === 0) {
    return <div style={{ padding: 16, color: '#6b7280' }}>No assembly flow data available.</div>;
  }

  const { stages, cycle, overall_yield_pct } = data;

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
            Box Assembly Flow
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
            {cycle} — SKU pool to delivered boxes.
          </p>
        </div>
        <div style={{
          background: '#ecfdf5', color: '#065f46', padding: '6px 12px',
          borderRadius: 999, fontSize: 12, fontWeight: 600
        }}>
          Overall yield: {overall_yield_pct}%
        </div>
      </div>

      <div style={{ width: '100%', height: 360, minWidth: 600 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={600} minHeight={360}>
          <BarChart
            layout="vertical"
            data={stages}
            margin={{ top: 10, right: 60, bottom: 10, left: 30 }}
            barCategoryGap={14}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis
              dataKey="stage"
              type="category"
              tick={{ fontSize: 12, fill: '#111827', fontWeight: 600 }}
              width={90}
            />
            <Tooltip
              cursor={{ fill: '#f9fafb' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const p = payload[0].payload;
                return (
                  <div style={{ background: '#111827', color: '#fff', padding: '8px 10px', borderRadius: 6, fontSize: 12 }}>
                    <div style={{ fontWeight: 600 }}>{p.stage}</div>
                    <div>Count: {p.count.toLocaleString()}</div>
                    <div>Conversion from prev: {p.conversion}%</div>
                    {p.drop > 0 && <div style={{ color: '#fca5a5' }}>Drop: {p.drop.toLocaleString()}</div>}
                    <div style={{ color: '#9ca3af', marginTop: 4 }}>{p.note}</div>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {stages.map((s, idx) => (
                <Cell key={`s-${idx}`} fill={s.fill} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                formatter={(v) => v.toLocaleString()}
                style={{ fill: '#111827', fontSize: 12, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 12 }}>
        {stages.map((s) => (
          <div key={s.stage} style={{
            border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px',
            background: '#fafafa'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, background: s.fill, borderRadius: 2 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{s.stage}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginTop: 4 }}>
              {s.count.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              {s.conversion}% of prev
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
