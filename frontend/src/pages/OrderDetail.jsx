import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiTrash2, FiUser, FiBox, FiDollarSign, FiCalendar, FiMapPin } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from '../components/Modal';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/api/orders/${id}`);
      const data = res.data.data || res.data;
      setOrder(data);
      setForm({ status: data.status || 'pending', total: data.total || data.total || '', shipping_address: data.shipping_address || '' });
    } catch (err) { toast.error('Failed to load order'); navigate('/orders'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/api/orders/${id}`, { customer_id: order.customer_id, box_id: order.box_id, ...form, total: parseFloat(form.total) || 0 });
      toast.success('Order updated');
      setShowEdit(false);
      fetchOrder();
    } catch (err) { toast.error('Failed to update'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this order?')) return;
    try { await api.delete(`/api/orders/${id}`); toast.success('Order deleted'); navigate('/orders'); } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="spinner-container"><div className="spinner" /></div>;
  if (!order) return null;

  return (
    <div>
      <Link to="/orders" className="back-link"><FiArrowLeft /> Back to Orders</Link>
      <div className="detail-header">
        <div className="detail-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h1>Order #{order.id}</h1>
            <span className={`badge badge-${(order.status || 'pending').toLowerCase()}`}>{order.status || 'Pending'}</span>
          </div>
          <div className="detail-meta">
            <div className="detail-meta-item"><FiUser /> {order.customer_name || `Customer #${order.customer_id}`}</div>
            <div className="detail-meta-item"><FiBox /> {order.box_name || `Box #${order.subscription_box_id}`}</div>
            <div className="detail-meta-item"><FiDollarSign /> ${parseFloat(order.total || order.total || 0).toFixed(2)}</div>
            <div className="detail-meta-item"><FiCalendar /> {order.order_date ? new Date(order.order_date).toLocaleDateString() : '-'}</div>
            {order.shipping_address && <div className="detail-meta-item"><FiMapPin /> {order.shipping_address}</div>}
          </div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-secondary" onClick={() => setShowEdit(true)}><FiEdit2 /> Edit</button>
          <button className="btn btn-danger" onClick={handleDelete}><FiTrash2 /> Delete</button>
        </div>
      </div>

      {(order.items || order.order_items || []).length > 0 && (
        <div className="detail-section">
          <h2>Order Items</h2>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Product</th><th>Quantity</th><th>Price</th></tr></thead>
              <tbody>
                {(order.items || order.order_items || []).map((item, i) => (
                  <tr key={i}>
                    <td>{item.product_name || item.name || `Product #${item.product_id}`}</td>
                    <td>{item.quantity || 1}</td>
                    <td className="price">${parseFloat(item.price || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Order">
        <form onSubmit={handleUpdate}>
          <div className="form-group"><label>Status</label>
            <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="form-group"><label>Total Amount</label><input className="form-input" type="number" step="0.01" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} /></div>
          <div className="form-group"><label>Shipping Address</label><textarea className="form-textarea" value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })} /></div>
          <div className="modal-footer" style={{ padding: 0, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <div className="spinner spinner-sm" /> : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
