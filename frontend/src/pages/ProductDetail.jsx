import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiTrash2, FiFileText, FiStar, FiDollarSign, FiTag, FiPackage, FiTruck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from '../components/Modal';
import AIResultDisplay from '../components/AIResultDisplay';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/api/products/${id}`);
      const data = res.data.data || res.data;
      setProduct(data);
      setForm({ name: data.name || '', description: data.description || '', price: data.price || '', category: data.category || '', rating: data.rating || '', stock: data.stock ?? data.stock ?? '', supplier: data.supplier || '' });
    } catch (err) {
      toast.error('Failed to load product');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProduct(); }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/api/products/${id}`, { ...form, price: parseFloat(form.price) || 0, rating: parseFloat(form.rating) || 0, stock: parseInt(form.stock) || 0 });
      toast.success('Product updated');
      setShowEdit(false);
      fetchProduct();
    } catch (err) { toast.error('Failed to update'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this product?')) return;
    try { await api.delete(`/api/products/${id}`); toast.success('Product deleted'); navigate('/products'); } catch { toast.error('Failed to delete'); }
  };

  const handleAI = async (type) => {
    setAiLoading(true);
    try {
      const endpoint = type === 'description' ? '/api/ai/write-description' : '/api/ai/score-quality';
      const payload = type === 'description'
        ? { name: product.name, category: product.category, details: product.description }
        : { product_id: product.id, name: product.name, category: product.category };
      const res = await api.post(endpoint, payload);
      setAiResult({ ...res.data, _type: type });
      toast.success(`AI ${type} complete`);
    } catch (err) { toast.error(err.response?.data?.error || 'AI request failed'); } finally { setAiLoading(false); }
  };

  if (loading) return <div className="spinner-container"><div className="spinner" /></div>;
  if (!product) return null;

  const stars = [];
  for (let i = 1; i <= 5; i++) stars.push(<FiStar key={i} style={{ fill: i <= Math.round(product.rating || 0) ? '#f59e0b' : 'none', color: i <= Math.round(product.rating || 0) ? '#f59e0b' : '#e5e7eb' }} />);

  return (
    <div>
      <Link to="/products" className="back-link"><FiArrowLeft /> Back to Products</Link>
      <div className="detail-header">
        <div className="detail-info">
          <h1>{product.name}</h1>
          <p className="text-muted">{product.description || 'No description'}</p>
          <div className="detail-meta">
            <div className="detail-meta-item"><FiDollarSign /> ${parseFloat(product.price || 0).toFixed(2)}</div>
            <div className="detail-meta-item"><FiTag /> {product.category || 'Uncategorized'}</div>
            <div className="detail-meta-item"><span className="stars">{stars}</span> ({product.rating || 0})</div>
            <div className="detail-meta-item"><FiPackage /> Stock: {product.stock ?? product.stock ?? 'N/A'}</div>
            <div className="detail-meta-item"><FiTruck /> {product.supplier || 'Unknown supplier'}</div>
          </div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-primary" onClick={() => handleAI('description')} disabled={aiLoading}>{aiLoading ? <div className="spinner spinner-sm" /> : <><FiFileText /> AI Description</>}</button>
          <button className="btn btn-success" onClick={() => handleAI('quality')} disabled={aiLoading}><FiStar /> AI Score</button>
          <button className="btn btn-secondary" onClick={() => setShowEdit(true)}><FiEdit2 /> Edit</button>
          <button className="btn btn-danger" onClick={handleDelete}><FiTrash2 /></button>
        </div>
      </div>

      {aiResult && <AIResultDisplay result={aiResult} featureName={aiResult._type === 'description' ? 'AI Description Writer' : 'AI Quality Score'} icon={FiFileText} />}

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Product">
        <form onSubmit={handleUpdate}>
          <div className="form-group"><label>Name</label><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="form-group"><label>Category</label><input className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group"><label>Price</label><input className="form-input" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div className="form-group"><label>Stock</label><input className="form-input" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group"><label>Rating</label><input className="form-input" type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></div>
            <div className="form-group"><label>Supplier</label><input className="form-input" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
          </div>
          <div className="form-group"><label>Description</label><textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="modal-footer" style={{ padding: 0, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <div className="spinner spinner-sm" /> : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
