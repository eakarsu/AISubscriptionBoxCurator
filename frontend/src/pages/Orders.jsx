import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiSearch, FiShoppingCart } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from '../components/Modal';

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ customer_id: '', box_id: '', status: 'pending', total: '', shipping_address: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [ordersRes, customersRes, boxesRes] = await Promise.allSettled([
        api.get('/api/orders'),
        api.get('/api/customers'),
        api.get('/api/subscription-boxes'),
      ]);
      if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data.data || ordersRes.value.data || []);
      if (customersRes.status === 'fulfilled') setCustomers(customersRes.value.data.data || customersRes.value.data || []);
      if (boxesRes.status === 'fulfilled') setBoxes(boxesRes.value.data.data || boxesRes.value.data || []);
    } catch (err) { toast.error('Failed to load orders'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.customer_id || !form.box_id) { toast.error('Customer and box required'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/orders', { ...form, customer_id: parseInt(form.customer_id), box_id: parseInt(form.box_id), total: parseFloat(form.total) || 0 });
      toast.success('Order created');
      setShowModal(false);
      setForm({ customer_id: '', box_id: '', status: 'pending', total: '', shipping_address: '' });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create order'); } finally { setSubmitting(false); }
  };

  const statuses = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const filtered = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || (o.status || '').toLowerCase() === statusFilter;
    const matchesSearch = (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) || String(o.id).includes(search);
    return matchesStatus && matchesSearch;
  });

  if (loading) return <div className="spinner-container"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Orders</h1><p className="page-subtitle">{orders.length} total orders</p></div>
        <div className="page-actions">
          <div className="search-bar"><FiSearch className="search-icon" /><input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><FiPlus /> New Order</button>
        </div>
      </div>

      <div className="filter-bar">
        {statuses.map((s) => (
          <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Order #</th><th>Customer</th><th>Box</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="clickable" onClick={() => navigate(`/orders/${o.id}`)}>
                  <td style={{ fontWeight: 600 }}>#{o.id}</td>
                  <td>{o.customer_name || `Customer #${o.customer_id}`}</td>
                  <td>{o.box_name || `Box #${o.box_id}`}</td>
                  <td><span className={`badge badge-${(o.status || 'pending').toLowerCase()}`}>{o.status || 'Pending'}</span></td>
                  <td className="price">${parseFloat(o.total || o.total || 0).toFixed(2)}</td>
                  <td className="text-muted">{o.order_date ? new Date(o.order_date).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card"><div className="empty-state"><div className="empty-state-icon"><FiShoppingCart /></div><h3>No orders found</h3><p>Create your first order.</p></div></div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Order">
        <form onSubmit={handleCreate}>
          <div className="form-group"><label>Customer *</label>
            <select className="form-select" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
            </select>
          </div>
          <div className="form-group"><label>Subscription Box *</label>
            <select className="form-select" value={form.box_id} onChange={(e) => {
              const box = boxes.find((b) => b.id === parseInt(e.target.value));
              setForm({ ...form, box_id: e.target.value, total: box ? box.price : form.total });
            }}>
              <option value="">Select box</option>
              {boxes.map((b) => <option key={b.id} value={b.id}>{b.name} (${parseFloat(b.price || 0).toFixed(2)})</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group"><label>Total</label><input className="form-input" type="number" step="0.01" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} /></div>
            <div className="form-group"><label>Status</label>
              <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label>Shipping Address</label><textarea className="form-textarea" value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })} placeholder="Shipping address..." /></div>
          <div className="modal-footer" style={{ padding: 0, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <div className="spinner spinner-sm" /> : 'Create Order'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
