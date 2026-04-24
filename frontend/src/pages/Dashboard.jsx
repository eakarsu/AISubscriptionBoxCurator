import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBox, FiPackage, FiUsers, FiShoppingCart, FiCpu, FiArrowRight } from 'react-icons/fi';
import api from '../services/api';

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ boxes: 0, products: 0, customers: 0, orders: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [boxesRes, productsRes, customersRes, ordersRes] = await Promise.allSettled([
          api.get('/api/subscription-boxes'),
          api.get('/api/products'),
          api.get('/api/customers'),
          api.get('/api/orders'),
        ]);
        setStats({
          boxes: boxesRes.status === 'fulfilled' ? (boxesRes.value.data.data || boxesRes.value.data || []).length : 0,
          products: productsRes.status === 'fulfilled' ? (productsRes.value.data.data || productsRes.value.data || []).length : 0,
          customers: customersRes.status === 'fulfilled' ? (customersRes.value.data.data || customersRes.value.data || []).length : 0,
          orders: ordersRes.status === 'fulfilled' ? (ordersRes.value.data.data || ordersRes.value.data || []).length : 0,
        });
        if (ordersRes.status === 'fulfilled') {
          const orders = ordersRes.value.data.data || ordersRes.value.data || [];
          setRecentOrders(orders.slice(0, 5));
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const aiQuickActions = [
    { label: 'Curate a Box', path: '/ai/curate-box' },
    { label: 'Discover Products', path: '/ai/discover-products' },
    { label: 'Optimize Pricing', path: '/ai/optimize-price' },
    { label: 'Generate Marketing', path: '/ai/generate-marketing' },
  ];

  if (loading) {
    return <div className="spinner-container"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name || 'User'}</h1>
          <p className="page-subtitle">Here is what is happening with your subscription boxes today.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/subscription-boxes')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon purple"><FiBox /></div>
          <div>
            <div className="stat-value">{stats.boxes}</div>
            <div className="stat-label">Subscription Boxes</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => navigate('/products')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon green"><FiPackage /></div>
          <div>
            <div className="stat-value">{stats.products}</div>
            <div className="stat-label">Products</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => navigate('/customers')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon blue"><FiUsers /></div>
          <div>
            <div className="stat-value">{stats.customers}</div>
            <div className="stat-label">Customers</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => navigate('/orders')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon orange"><FiShoppingCart /></div>
          <div>
            <div className="stat-value">{stats.orders}</div>
            <div className="stat-label">Orders</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card" style={{ gridColumn: window.innerWidth < 900 ? '1 / -1' : undefined }}>
          <div className="card-header">
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Recent Orders</h3>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/orders')}>View All</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {recentOrders.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="clickable" onClick={() => navigate(`/orders/${order.id}`)}>
                      <td>#{order.id}</td>
                      <td>{order.customer_name || order.customer?.name || `Customer #${order.customer_id}`}</td>
                      <td>
                        <span className={`badge badge-${(order.status || 'pending').toLowerCase()}`}>
                          {order.status || 'Pending'}
                        </span>
                      </td>
                      <td className="price">${parseFloat(order.total_amount || order.total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>No recent orders</p>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ gridColumn: window.innerWidth < 900 ? '1 / -1' : undefined }}>
          <div className="card-header">
            <h3 style={{ fontSize: 16, fontWeight: 700 }}><FiCpu style={{ marginRight: 8, verticalAlign: -2 }} />AI Quick Actions</h3>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/ai-center')}>All Features</button>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {aiQuickActions.map((action) => (
                <button
                  key={action.path}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'space-between' }}
                  onClick={() => navigate(action.path)}
                >
                  {action.label}
                  <FiArrowRight />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
