import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiTrash2, FiHeart, FiMail, FiMapPin, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from '../components/Modal';
import AIResultDisplay from '../components/AIResultDisplay';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get(`/api/customers/${id}`);
      const data = res.data.data || res.data;
      setCustomer(data);
      setForm({ name: data.name || '', email: data.email || '', subscription_tier: data.subscription_tier || 'basic', status: data.status || 'active', preferences: data.preferences || '' });
      setOrders(data.orders || []);
    } catch (err) { toast.error('Failed to load customer'); navigate('/customers'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try { await api.put(`/api/customers/${id}`, form); toast.success('Customer updated'); setShowEdit(false); fetchData(); }
    catch (err) { toast.error('Failed to update'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this customer?')) return;
    try { await api.delete(`/api/customers/${id}`); toast.success('Customer deleted'); navigate('/customers'); } catch { toast.error('Failed to delete'); }
  };

  const handleAI = async () => {
    setAiLoading(true);
    try {
      const res = await api.post('/api/ai/personalize-recommendations', { customer_id: parseInt(id), name: customer.name, preferences: customer.preferences, subscription_tier: customer.subscription_tier });
      setAiResult(res.data);
      toast.success('AI recommendations ready');
    } catch (err) { toast.error(err.response?.data?.error || 'AI request failed'); } finally { setAiLoading(false); }
  };

  if (loading) return <div className="spinner-container"><div className="spinner" /></div>;
  if (!customer) return null;

  return (
    <div>
      <Link to="/customers" className="back-link"><FiArrowLeft /> Back to Customers</Link>
      <div className="detail-header">
        <div className="detail-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h1>{customer.name}</h1>
            <span className={`badge badge-${(customer.subscription_tier || 'basic').toLowerCase()}`}>{customer.subscription_tier || 'Basic'}</span>
            <span className={`badge badge-${(customer.status || 'active').toLowerCase()}`}>{customer.status || 'Active'}</span>
          </div>
          <div className="detail-meta">
            <div className="detail-meta-item"><FiMail /> {customer.email}</div>
            {customer.address && <div className="detail-meta-item"><FiMapPin /> {customer.address}</div>}
            <div className="detail-meta-item"><FiDollarSign /> Lifetime: ${parseFloat(customer.lifetime_value || customer.total_spent || 0).toFixed(2)}</div>
          </div>
          {customer.preferences && <p className="text-muted" style={{ marginTop: 8 }}>Preferences: {customer.preferences}</p>}
        </div>
        <div className="detail-actions">
          <button className="btn btn-primary" onClick={handleAI} disabled={aiLoading}>{aiLoading ? <div className="spinner spinner-sm" /> : <><FiHeart /> AI Personalize</>}</button>
          <button className="btn btn-secondary" onClick={() => setShowEdit(true)}><FiEdit2 /> Edit</button>
          <button className="btn btn-danger" onClick={handleDelete}><FiTrash2 /></button>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="detail-section">
          <h2>Order History</h2>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Order</th><th>Box</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="clickable" onClick={() => navigate(`/orders/${o.id}`)}>
                    <td>#{o.id}</td>
                    <td>{o.box_name || `Box #${o.subscription_box_id}`}</td>
                    <td><span className={`badge badge-${(o.status || 'pending').toLowerCase()}`}>{o.status || 'Pending'}</span></td>
                    <td className="price">${parseFloat(o.total_amount || o.total || 0).toFixed(2)}</td>
                    <td className="text-muted">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aiResult && <AIResultDisplay result={aiResult} featureName="Personalized Recommendations" icon={FiHeart} />}

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Customer">
        <form onSubmit={handleUpdate}>
          <div className="form-group"><label>Name</label><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="form-group"><label>Email</label><input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group"><label>Tier</label>
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
          <div className="form-group"><label>Address</label><input className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="form-group"><label>Preferences</label><textarea className="form-textarea" value={form.preferences} onChange={(e) => setForm({ ...form, preferences: e.target.value })} /></div>
          <div className="modal-footer" style={{ padding: 0, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <div className="spinner spinner-sm" /> : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
