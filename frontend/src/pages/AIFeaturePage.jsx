import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiBox, FiSearch, FiDollarSign, FiSun, FiFileText, FiBarChart2,
  FiTrendingUp, FiHeart, FiEdit3, FiStar, FiActivity, FiPieChart, FiSend
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import AIResultDisplay from '../components/AIResultDisplay';

const featureConfig = {
  'curate-box': {
    title: 'Box Curator',
    desc: 'AI-powered curation of subscription box contents based on theme, budget, and preferences.',
    icon: FiBox,
    endpoint: '/api/ai/curate-box',
    fields: [
      { name: 'theme', label: 'Theme', type: 'text', placeholder: 'e.g. Self-Care & Wellness' },
      { name: 'category', label: 'Category', type: 'text', placeholder: 'e.g. Health & Beauty' },
      { name: 'budget', label: 'Budget ($)', type: 'number', placeholder: '50' },
      { name: 'item_count', label: 'Number of Items', type: 'number', placeholder: '5' },
    ],
  },
  'discover-products': {
    title: 'Product Discovery',
    desc: 'Discover new products that match your subscription box themes.',
    icon: FiSearch,
    endpoint: '/api/ai/discover-products',
    fields: [
      { name: 'category', label: 'Category', type: 'text', placeholder: 'e.g. Organic Skincare' },
      { name: 'price_range', label: 'Price Range', type: 'text', placeholder: 'e.g. $10-$30' },
      { name: 'target_audience', label: 'Target Audience', type: 'text', placeholder: 'e.g. Women 25-40' },
    ],
  },
  'optimize-price': {
    title: 'Price Optimizer',
    desc: 'Find the optimal price point for maximum revenue.',
    icon: FiDollarSign,
    endpoint: '/api/ai/optimize-price',
    fields: [
      { name: 'box_name', label: 'Box Name', type: 'text', placeholder: 'Name of the box' },
      { name: 'current_price', label: 'Current Price ($)', type: 'number', placeholder: '29.99' },
      { name: 'cost', label: 'Cost ($)', type: 'number', placeholder: '15.00' },
      { name: 'competitor_prices', label: 'Competitor Prices', type: 'text', placeholder: 'e.g. $25, $35, $40' },
    ],
    needsBoxes: true,
  },
  'generate-theme': {
    title: 'Theme Generator',
    desc: 'Generate creative themes for your subscription boxes.',
    icon: FiSun,
    endpoint: '/api/ai/generate-theme',
    fields: [
      { name: 'season', label: 'Season', type: 'select', options: ['Spring', 'Summer', 'Fall', 'Winter', 'Any'] },
      { name: 'target_audience', label: 'Target Audience', type: 'text', placeholder: 'e.g. Young Professionals' },
      { name: 'category', label: 'Category', type: 'text', placeholder: 'e.g. Food & Beverage' },
      { name: 'count', label: 'Number of Themes', type: 'number', placeholder: '5' },
    ],
  },
  'write-description': {
    title: 'Description Writer',
    desc: 'Generate compelling descriptions for products and boxes.',
    icon: FiFileText,
    endpoint: '/api/ai/write-description',
    fields: [
      { name: 'name', label: 'Product/Box Name', type: 'text', placeholder: 'Name of the item' },
      { name: 'category', label: 'Category', type: 'text', placeholder: 'e.g. Skincare' },
      { name: 'details', label: 'Key Details', type: 'textarea', placeholder: 'Key features, ingredients, benefits...' },
      { name: 'tone', label: 'Tone', type: 'select', options: ['Professional', 'Casual', 'Luxurious', 'Fun', 'Minimalist'] },
    ],
  },
  'analyze-feedback': {
    title: 'Feedback Analyzer',
    desc: 'Analyze customer feedback patterns and sentiment.',
    icon: FiBarChart2,
    endpoint: '/api/ai/analyze-feedback',
    fields: [
      { name: 'time_period', label: 'Time Period', type: 'select', options: ['Last 7 days', 'Last 30 days', 'Last 90 days', 'All time'] },
    ],
    isAction: true,
    actionLabel: 'Analyze All Feedback',
  },
  'forecast-demand': {
    title: 'Demand Forecaster',
    desc: 'Predict future demand patterns.',
    icon: FiTrendingUp,
    endpoint: '/api/ai/forecast-demand',
    fields: [
      { name: 'time_period', label: 'Forecast Period', type: 'select', options: ['Next Month', 'Next Quarter', 'Next 6 Months', 'Next Year'] },
      { name: 'category', label: 'Category (optional)', type: 'text', placeholder: 'e.g. Beauty' },
    ],
  },
  'personalize-recommendations': {
    title: 'Personalized Recommendations',
    desc: 'Generate personalized recommendations for individual customers.',
    icon: FiHeart,
    endpoint: '/api/ai/personalize-recommendations',
    fields: [
      { name: 'customer_id', label: 'Customer', type: 'customer-select' },
      { name: 'count', label: 'Number of Recommendations', type: 'number', placeholder: '5' },
    ],
    needsCustomers: true,
  },
  'generate-marketing': {
    title: 'Marketing Copy',
    desc: 'Create engaging marketing copy for various platforms.',
    icon: FiEdit3,
    endpoint: '/api/ai/generate-marketing',
    fields: [
      { name: 'product_name', label: 'Product/Box Name', type: 'text', placeholder: 'Name to market' },
      { name: 'platform', label: 'Platform', type: 'select', options: ['Email', 'Instagram', 'Facebook', 'Twitter', 'Landing Page', 'SMS'] },
      { name: 'target_audience', label: 'Target Audience', type: 'text', placeholder: 'e.g. Health-conscious millennials' },
      { name: 'key_selling_points', label: 'Key Selling Points', type: 'textarea', placeholder: 'Main benefits and features...' },
    ],
  },
  'score-quality': {
    title: 'Quality Scorer',
    desc: 'Score and evaluate product quality.',
    icon: FiStar,
    endpoint: '/api/ai/score-quality',
    fields: [
      { name: 'product_id', label: 'Product', type: 'product-select' },
    ],
    needsProducts: true,
  },
  'analyze-trends': {
    title: 'Trend Analyzer',
    desc: 'Identify emerging market trends.',
    icon: FiActivity,
    endpoint: '/api/ai/analyze-trends',
    fields: [
      { name: 'market_segment', label: 'Market Segment', type: 'text', placeholder: 'e.g. Subscription Boxes, Beauty, Tech' },
      { name: 'region', label: 'Region (optional)', type: 'text', placeholder: 'e.g. North America' },
    ],
  },
  'segment-customers': {
    title: 'Customer Segmentation',
    desc: 'AI-driven customer segmentation analysis.',
    icon: FiPieChart,
    endpoint: '/api/ai/segment-customers',
    fields: [
      { name: 'criteria', label: 'Segmentation Criteria', type: 'select', options: ['Behavior', 'Demographics', 'Purchase History', 'Engagement', 'All'] },
    ],
    isAction: true,
    actionLabel: 'Analyze Customer Segments',
  },
};

export default function AIFeaturePage() {
  const { feature } = useParams();
  const config = featureConfig[feature];
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [boxes, setBoxes] = useState([]);

  useEffect(() => {
    setFormData({});
    setResult(null);
  }, [feature]);

  useEffect(() => {
    const fetchRefs = async () => {
      if (config?.needsCustomers) {
        try { const r = await api.get('/api/customers'); setCustomers(r.data.data || r.data || []); } catch {}
      }
      if (config?.needsProducts) {
        try { const r = await api.get('/api/products'); setProducts(r.data.data || r.data || []); } catch {}
      }
      if (config?.needsBoxes) {
        try { const r = await api.get('/api/subscription-boxes'); setBoxes(r.data.data || r.data || []); } catch {}
      }
    };
    fetchRefs();
  }, [feature]);

  if (!config) {
    return (
      <div>
        <Link to="/ai-center" className="back-link"><FiArrowLeft /> Back to AI Center</Link>
        <div className="card"><div className="empty-state"><h3>Feature not found</h3><p>This AI feature does not exist.</p></div></div>
      </div>
    );
  }

  const Icon = config.icon;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      if (payload.budget) payload.budget = parseFloat(payload.budget);
      if (payload.current_price) payload.current_price = parseFloat(payload.current_price);
      if (payload.cost) payload.cost = parseFloat(payload.cost);
      if (payload.item_count) payload.item_count = parseInt(payload.item_count);
      if (payload.count) payload.count = parseInt(payload.count);
      if (payload.customer_id) payload.customer_id = parseInt(payload.customer_id);
      if (payload.product_id) payload.product_id = parseInt(payload.product_id);

      const res = await api.post(config.endpoint, payload);
      const newResult = { ...res.data, timestamp: new Date().toLocaleString() };
      setResult(newResult);
      setHistory((prev) => [newResult, ...prev]);
      toast.success(`${config.title} complete`);
    } catch (err) {
      toast.error(err.response?.data?.error || `${config.title} failed`);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const renderField = (field) => {
    switch (field.type) {
      case 'select':
        return (
          <select className="form-select" value={formData[field.name] || ''} onChange={(e) => updateField(field.name, e.target.value)}>
            <option value="">Select {field.label}</option>
            {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case 'textarea':
        return (
          <textarea className="form-textarea" value={formData[field.name] || ''} onChange={(e) => updateField(field.name, e.target.value)} placeholder={field.placeholder} />
        );
      case 'customer-select':
        return (
          <select className="form-select" value={formData[field.name] || ''} onChange={(e) => updateField(field.name, e.target.value)}>
            <option value="">Select Customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
          </select>
        );
      case 'product-select':
        return (
          <select className="form-select" value={formData[field.name] || ''} onChange={(e) => updateField(field.name, e.target.value)}>
            <option value="">Select Product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} - ${parseFloat(p.price || 0).toFixed(2)}</option>)}
          </select>
        );
      default:
        return (
          <input className="form-input" type={field.type || 'text'} value={formData[field.name] || ''} onChange={(e) => updateField(field.name, e.target.value)} placeholder={field.placeholder} step={field.type === 'number' ? 'any' : undefined} />
        );
    }
  };

  return (
    <div>
      <Link to="/ai-center" className="back-link"><FiArrowLeft /> Back to AI Center</Link>

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24 }}>
            <Icon />
          </div>
          <div>
            <h1 className="page-title">{config.title}</h1>
            <p className="page-subtitle">{config.desc}</p>
          </div>
        </div>
      </div>

      <div className="ai-form">
        <h3>Configure & Run</h3>
        <form onSubmit={handleSubmit}>
          <div className="ai-form" style={{ padding: 0, border: 'none', marginBottom: 0 }}>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {config.fields.map((field) => (
                <div key={field.name} className="form-group" style={field.type === 'textarea' ? { gridColumn: '1 / -1' } : {}}>
                  <label>{field.label}</label>
                  {renderField(field)}
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? (
                <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Processing...</>
              ) : (
                <><FiSend /> {config.isAction ? config.actionLabel : `Run ${config.title}`}</>
              )}
            </button>
          </div>
        </form>
      </div>

      {result && <AIResultDisplay result={result} featureName={config.title} icon={Icon} />}

      {history.length > 1 && (
        <div className="ai-history">
          <h3>Previous Results</h3>
          {history.slice(1).map((h, i) => (
            <AIResultDisplay key={i} result={h} featureName={config.title} icon={Icon} />
          ))}
        </div>
      )}
    </div>
  );
}
