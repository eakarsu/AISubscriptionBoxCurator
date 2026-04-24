import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiSearch, FiStar, FiPackage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from '../components/Modal';

function Stars({ rating }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(<FiStar key={i} style={{ fill: i <= rating ? '#f59e0b' : 'none', color: i <= rating ? '#f59e0b' : '#e5e7eb' }} />);
  }
  return <span className="stars">{stars}</span>;
}

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '', category: '', rating: '', stock: '', supplier: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/api/products');
      setProducts(res.data.data || res.data || []);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Name is required'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/products', {
        ...form,
        price: parseFloat(form.price) || 0,
        rating: parseFloat(form.rating) || 0,
        stock: parseInt(form.stock) || 0,
      });
      toast.success('Product created');
      setShowModal(false);
      setForm({ name: '', description: '', price: '', category: '', rating: '', stock: '', supplier: '' });
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = products.filter((p) =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="spinner-container"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">{products.length} total products</p>
        </div>
        <div className="page-actions">
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><FiPlus /> New Product</button>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Category</th><th>Price</th><th>Rating</th><th>Stock</th><th>Supplier</th></tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="clickable" onClick={() => navigate(`/products/${p.id}`)}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td><span className="badge badge-premium">{p.category || '-'}</span></td>
                  <td className="price">${parseFloat(p.price || 0).toFixed(2)}</td>
                  <td><Stars rating={Math.round(p.rating || 0)} /></td>
                  <td>{p.stock ?? p.stock ?? '-'}</td>
                  <td>{p.supplier || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card"><div className="empty-state"><div className="empty-state-icon"><FiPackage /></div><h3>No products found</h3><p>Add your first product to get started.</p></div></div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Product">
        <form onSubmit={handleCreate}>
          <div className="form-group"><label>Name *</label><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" /></div>
          <div className="form-group"><label>Category</label><input className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Skincare" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group"><label>Price</label><input className="form-input" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="9.99" /></div>
            <div className="form-group"><label>Stock</label><input className="form-input" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="100" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group"><label>Rating (0-5)</label><input className="form-input" type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></div>
            <div className="form-group"><label>Supplier</label><input className="form-input" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Supplier name" /></div>
          </div>
          <div className="form-group"><label>Description</label><textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description..." /></div>
          <div className="modal-footer" style={{ padding: 0, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <div className="spinner spinner-sm" /> : 'Create Product'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
