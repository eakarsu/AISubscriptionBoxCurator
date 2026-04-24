import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiTrash2, FiCpu, FiDollarSign, FiTag, FiBox } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from '../components/Modal';
import AIResultDisplay from '../components/AIResultDisplay';

export default function BoxDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [box, setBox] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchBox = async () => {
    try {
      const res = await api.get(`/api/subscription-boxes/${id}`);
      const data = res.data.data || res.data;
      setBox(data);
      setForm({ name: data.name || '', theme: data.theme || '', description: data.description || '', price: data.price || '', status: data.status || 'active', category: data.category || '' });
    } catch (err) {
      toast.error('Failed to load box details');
      navigate('/subscription-boxes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBox(); }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/api/subscription-boxes/${id}`, { ...form, price: parseFloat(form.price) || 0 });
      toast.success('Box updated successfully');
      setShowEdit(false);
      fetchBox();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this box?')) return;
    try {
      await api.delete(`/api/subscription-boxes/${id}`);
      toast.success('Box deleted');
      navigate('/subscription-boxes');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleAICurate = async () => {
    setAiLoading(true);
    try {
      const res = await api.post('/api/ai/curate-box', { theme: box.theme, category: box.category, budget: box.price });
      setAiResult(res.data);
      toast.success('AI curation complete');
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI curation failed');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <div className="spinner-container"><div className="spinner" /></div>;
  if (!box) return null;

  const items = box.items || box.box_items || [];

  return (
    <div>
      <Link to="/subscription-boxes" className="back-link"><FiArrowLeft /> Back to Boxes</Link>

      <div className="detail-header">
        <div className="detail-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h1>{box.name}</h1>
            <span className={`badge badge-${(box.status || 'active').toLowerCase()}`}>{box.status || 'Active'}</span>
          </div>
          <p className="text-muted">{box.description || 'No description'}</p>
          <div className="detail-meta">
            <div className="detail-meta-item"><FiTag /> {box.theme || 'No theme'}</div>
            <div className="detail-meta-item"><FiDollarSign /> ${parseFloat(box.price || 0).toFixed(2)}</div>
            <div className="detail-meta-item"><FiBox /> {items.length} items</div>
          </div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-primary" onClick={handleAICurate} disabled={aiLoading}>
            {aiLoading ? <div className="spinner spinner-sm" /> : <><FiCpu /> AI Curate Items</>}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowEdit(true)}><FiEdit2 /> Edit</button>
          <button className="btn btn-danger" onClick={handleDelete}><FiTrash2 /> Delete</button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="detail-section">
          <h2>Items in this Box</h2>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Quantity</th></tr></thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="clickable" onClick={() => item.product_id && navigate(`/products/${item.product_id}`)}>
                    <td>{item.product_name || item.name || `Product #${item.product_id}`}</td>
                    <td>{item.category || '-'}</td>
                    <td className="price">${parseFloat(item.price || 0).toFixed(2)}</td>
                    <td>{item.quantity || 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aiResult && <AIResultDisplay result={aiResult} featureName="AI Box Curation" icon={FiCpu} />}

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Subscription Box">
        <form onSubmit={handleUpdate}>
          <div className="form-group">
            <label>Name</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Theme</label>
            <input className="form-input" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Category</label>
            <input className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Price</label>
            <input className="form-input" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
            <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <div className="spinner spinner-sm" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
