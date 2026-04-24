import React, { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiStar, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from '../components/Modal';

function Stars({ rating }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) stars.push(<FiStar key={i} style={{ fill: i <= rating ? '#f59e0b' : 'none', color: i <= rating ? '#f59e0b' : '#e5e7eb', fontSize: 14 }} />);
  return <span className="stars">{stars}</span>;
}

export default function Feedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [form, setForm] = useState({ customer_id: '', box_id: '', rating: '5', comment: '', sentiment: 'positive' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [fbRes, custRes, boxRes] = await Promise.allSettled([
        api.get('/api/feedback'),
        api.get('/api/customers'),
        api.get('/api/subscription-boxes'),
      ]);
      if (fbRes.status === 'fulfilled') setFeedbacks(fbRes.value.data.data || fbRes.value.data || []);
      if (custRes.status === 'fulfilled') setCustomers(custRes.value.data.data || custRes.value.data || []);
      if (boxRes.status === 'fulfilled') setBoxes(boxRes.value.data.data || boxRes.value.data || []);
    } catch (err) { toast.error('Failed to load feedback'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.comment) { toast.error('Comment required'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/feedback', { ...form, customer_id: parseInt(form.customer_id) || undefined, box_id: parseInt(form.box_id) || undefined, rating: parseInt(form.rating) });
      toast.success('Feedback submitted');
      setShowModal(false);
      setForm({ customer_id: '', box_id: '', rating: '5', comment: '', sentiment: 'positive' });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to submit'); } finally { setSubmitting(false); }
  };

  const filtered = feedbacks.filter((f) =>
    (f.comment || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.customer_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const sentimentColor = (s) => {
    switch ((s || '').toLowerCase()) {
      case 'positive': return 'badge-positive';
      case 'negative': return 'badge-negative';
      default: return 'badge-neutral';
    }
  };

  if (loading) return <div className="spinner-container"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Feedback</h1><p className="page-subtitle">{feedbacks.length} total entries</p></div>
        <div className="page-actions">
          <div className="search-bar"><FiSearch className="search-icon" /><input placeholder="Search feedback..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><FiPlus /> New Feedback</button>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid-2">
          {filtered.map((f) => (
            <div key={f.id} className="card card-clickable" onClick={() => setShowDetail(f)}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Stars rating={f.rating || 0} />
                  <span className={`badge ${sentimentColor(f.sentiment)}`}>{f.sentiment || 'Neutral'}</span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {f.comment || 'No comment'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-light)' }}>
                  <span>{f.customer_name || `Customer #${f.customer_id || 'N/A'}`}</span>
                  <span>{f.created_at ? new Date(f.created_at).toLocaleDateString() : ''}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card"><div className="empty-state"><div className="empty-state-icon"><FiMessageSquare /></div><h3>No feedback yet</h3><p>Submit your first feedback entry.</p></div></div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Submit Feedback">
        <form onSubmit={handleCreate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group"><label>Customer</label>
              <select className="form-select" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                <option value="">Select customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Box</label>
              <select className="form-select" value={form.box_id} onChange={(e) => setForm({ ...form, box_id: e.target.value })}>
                <option value="">Select box</option>
                {boxes.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group"><label>Rating</label>
              <select className="form-select" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
                {[5,4,3,2,1].map((r) => <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Sentiment</label>
              <select className="form-select" value={form.sentiment} onChange={(e) => setForm({ ...form, sentiment: e.target.value })}>
                <option value="positive">Positive</option><option value="neutral">Neutral</option><option value="negative">Negative</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label>Comment *</label><textarea className="form-textarea" rows={4} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="Write your feedback..." /></div>
          <div className="modal-footer" style={{ padding: 0, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <div className="spinner spinner-sm" /> : 'Submit'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Feedback Details">
        {showDetail && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <Stars rating={showDetail.rating || 0} />
              <span className={`badge ${sentimentColor(showDetail.sentiment)}`}>{showDetail.sentiment || 'Neutral'}</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)', marginBottom: 16 }}>{showDetail.comment}</p>
            <div style={{ fontSize: 13, color: 'var(--text-light)' }}>
              <p>Customer: {showDetail.customer_name || `#${showDetail.customer_id || 'N/A'}`}</p>
              <p>Box: {showDetail.box_name || `#${showDetail.box_id || 'N/A'}`}</p>
              <p>Date: {showDetail.created_at ? new Date(showDetail.created_at).toLocaleString() : 'N/A'}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
