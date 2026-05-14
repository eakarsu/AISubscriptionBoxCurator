import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBox, FiSearch, FiDollarSign, FiSun, FiFileText, FiBarChart2,
  FiTrendingUp, FiHeart, FiEdit3, FiStar, FiActivity, FiPieChart, FiArrowRight
} from 'react-icons/fi';

const features = [
  {
    key: 'curate-box', icon: FiBox, title: 'Box Curator',
    desc: 'AI-powered curation of subscription box contents based on theme, budget, and customer preferences.',
    category: 'Creation'
  },
  {
    key: 'discover-products', icon: FiSearch, title: 'Product Discovery',
    desc: 'Discover new products that match your subscription box themes and customer interests.',
    category: 'Creation'
  },
  {
    key: 'optimize-price', icon: FiDollarSign, title: 'Price Optimizer',
    desc: 'AI analysis to find the optimal price point for maximum revenue and customer satisfaction.',
    category: 'Optimization'
  },
  {
    key: 'generate-theme', icon: FiSun, title: 'Theme Generator',
    desc: 'Generate creative and trending themes for your subscription boxes based on season and audience.',
    category: 'Creation'
  },
  {
    key: 'write-description', icon: FiFileText, title: 'Description Writer',
    desc: 'Generate compelling product and box descriptions that convert browsers to subscribers.',
    category: 'Content'
  },
  {
    key: 'analyze-feedback', icon: FiBarChart2, title: 'Feedback Analyzer',
    desc: 'Analyze customer feedback patterns to identify improvements and satisfaction drivers.',
    category: 'Analytics'
  },
  {
    key: 'forecast-demand', icon: FiTrendingUp, title: 'Demand Forecaster',
    desc: 'Predict future demand patterns to optimize inventory and reduce waste.',
    category: 'Analytics'
  },
  {
    key: 'personalize-recommendations', icon: FiHeart, title: 'Personalized Recommendations',
    desc: 'Generate personalized product and box recommendations for individual customers.',
    category: 'Personalization'
  },
  {
    key: 'generate-marketing', icon: FiEdit3, title: 'Marketing Copy',
    desc: 'Create engaging marketing copy for email campaigns, social media, and landing pages.',
    category: 'Content'
  },
  {
    key: 'score-quality', icon: FiStar, title: 'Quality Scorer',
    desc: 'Score and evaluate product quality based on multiple factors and customer feedback.',
    category: 'Optimization'
  },
  {
    key: 'analyze-trends', icon: FiActivity, title: 'Trend Analyzer',
    desc: 'Identify emerging market trends and opportunities in the subscription box space.',
    category: 'Analytics'
  },
  {
    key: 'segment-customers', icon: FiPieChart, title: 'Customer Segmentation',
    desc: 'AI-driven customer segmentation for targeted marketing and personalized experiences.',
    category: 'Personalization'
  },
  {
    key: 'customer-ltv', icon: FiTrendingUp, title: 'Customer LTV Predictor',
    desc: 'Predict customer lifetime value with acquisition spend cap recommendations.',
    category: 'Analytics'
  },
  {
    key: 'unboxing-arrangement', icon: FiBox, title: 'Unboxing Arrangement',
    desc: 'AI-suggested physical layout and reveal sequence for the unboxing experience.',
    category: 'Optimization'
  },
  {
    key: 'competitor-price-monitor', icon: FiDollarSign, title: 'Competitor Price Monitor',
    desc: 'Compare our box vs. competitors and recommend a pricing posture.',
    category: 'Analytics'
  },
  {
    key: 'preference-bandit', icon: FiActivity, title: 'Preference Bandit',
    desc: 'Bandit-style scoring step over candidate boxes for preference learning.',
    category: 'Personalization'
  },
];

export default function AICenter() {
  const navigate = useNavigate();

  const categories = [...new Set(features.map((f) => f.category))];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Center</h1>
          <p className="page-subtitle">12 AI-powered features to supercharge your subscription box business</p>
        </div>
      </div>

      {categories.map((cat) => (
        <div key={cat} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>{cat}</h2>
          <div className="grid-3">
            {features.filter((f) => f.category === cat).map((feature) => (
              <div key={feature.key} className="ai-feature-card" onClick={() => navigate(`/ai/${feature.key}`)}>
                <div className="ai-feature-icon"><feature.icon /></div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
                <div className="ai-feature-launch">
                  Launch <FiArrowRight />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
