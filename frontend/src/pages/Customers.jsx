import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiSearch, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from '../components/Modal';

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subscription_tier: 'basic', status: 'active', preferences: '', address: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/api/customers');
      setCustomers(res.data.data || res.data || []);
    } catch (err) { toast.error('Failed to load customers'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) { toast.error('Name and email required'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/customers', form);
      toast.success('Customer created');
      setShowModal(false);
      setForm({ name: '', email: '', subscription_tier: 'basic', status: 'active', preferences: '', address: '' });
      fetchCustomers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create'); } finally { setSubmitting(false); }
  };

  const filtered = customers.filter((c) =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="spinner-container"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Customers</h1><p className="page-subtitle">{customers.length} total customers</p></div>
        <div className="page-actions">
          <div className="search-bar"><FiSearch className="search-icon" /><input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><FiPlus /> New Customer</button>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Tier</th><th>Status</th><th>Lifetime Value</th></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="clickable" onClick={() => navigate(`/customers/${c.id}`)}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className="text-muted">{c.email}</td>
                  <td><span className={`badge badge-${(c.subscription_tier || 'basic').toLowerCase()}`}>{c.subscription_tier || 'Basic'}</span></td>
                  <td><span className={`badge badge-${(c.status || 'active').toLowerCase()}`}>{c.status || 'Active'}</span></td>
                  <td className="price">${parseFloat(c.lifetime_value || c.total_spent || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card"><div className="empty-state"><div className="empty-state-icon"><FiUsers /></div><h3>No customers found</h3><p>Add your first customer.</p></div></div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Customer">
        <form onSubmit={handleCreate}>
          <div className="form-group"><label>Name *</label><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></div>
          <div className="form-group"><label>Email *</label><input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group"><label>Subscription Tier</label>
              <select className="form-select" value={form.subscription_tier} onChange={(e) => setForm({ ...form, subscription_tier: e.target.value })}>
                <option value="basic">Basic</option><option value="premium">Premium</option><option value="vip">VIP</option>
              </select>
            </div>
            <div className="form-group"><label>Status</label>
              <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label>Address</label><input className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Shipping address" /></div>
          <div className="form-group"><label>Preferences</label><textarea className="form-textarea" value={form.preferences} onChange={(e) => setForm({ ...form, preferences: e.target.value })} placeholder="Customer preferences..." /></div>
          <div className="modal-footer" style={{ padding: 0, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <div className="spinner spinner-sm" /> : 'Create Customer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
