import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiSearch, FiBox } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from '../components/Modal';

export default function SubscriptionBoxes() {
  const navigate = useNavigate();
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', theme: '', description: '', price: '', status: 'active', category: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchBoxes = async () => {
    try {
      const res = await api.get('/api/subscription-boxes');
      setBoxes(res.data.data || res.data || []);
    } catch (err) {
      toast.error('Failed to load subscription boxes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBoxes(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Name is required'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/subscription-boxes', { ...form, price: parseFloat(form.price) || 0 });
      toast.success('Box created successfully');
      setShowModal(false);
      setForm({ name: '', theme: '', description: '', price: '', status: 'active', category: '' });
      fetchBoxes();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create box');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = boxes.filter((b) =>
    (b.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.theme || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="spinner-container"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscription Boxes</h1>
          <p className="page-subtitle">{boxes.length} total boxes</p>
        </div>
        <div className="page-actions">
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input placeholder="Search boxes..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <FiPlus /> New Box
          </button>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid-3">
          {filtered.map((box) => (
            <div key={box.id} className="card card-clickable" onClick={() => navigate(`/subscription-boxes/${box.id}`)}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <FiBox size={20} />
                  </div>
                  <span className={`badge badge-${(box.status || 'active').toLowerCase()}`}>{box.status || 'Active'}</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{box.name}</h3>
                <p className="text-muted text-sm" style={{ marginBottom: 12 }}>{box.theme || 'No theme'}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="price" style={{ fontSize: 20 }}>${parseFloat(box.price || 0).toFixed(2)}</span>
                  <span className="text-xs text-muted">{box.item_count || box.items?.length || 0} items</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><FiBox /></div>
            <h3>No subscription boxes found</h3>
            <p>Create your first subscription box to get started.</p>
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Subscription Box">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Name *</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Wellness Wonder Box" />
          </div>
          <div className="form-group">
            <label>Theme</label>
            <input className="form-input" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} placeholder="e.g. Self-Care & Wellness" />
          </div>
          <div className="form-group">
            <label>Category</label>
            <input className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Health & Beauty" />
          </div>
          <div className="form-group">
            <label>Price</label>
            <input className="form-input" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="29.99" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe this box..." />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div className="modal-footer" style={{ padding: 0, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <div className="spinner spinner-sm" /> : 'Create Box'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
