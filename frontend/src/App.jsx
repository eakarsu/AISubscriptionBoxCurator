import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SubscriptionBoxes from './pages/SubscriptionBoxes';
import BoxDetail from './pages/BoxDetail';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Feedback from './pages/Feedback';
import AICenter from './pages/AICenter';
import AIFeaturePage from './pages/AIFeaturePage';
import QuizOnboarding from './pages/QuizOnboarding';
import ChurnDashboard from './pages/ChurnDashboard';
import CustomViewsPage from './pages/CustomViewsPage';
// === Batch 08 Gaps & Frontend Mounts ===
import CfSeasonalDemandForecastingForInventorySpikesAround from './pages/CfSeasonalDemandForecastingForInventorySpikesAround'
import CfUnboxingExperienceOptimizationWithAiSuggestedProduct from './pages/CfUnboxingExperienceOptimizationWithAiSuggestedProduct'
import CfCompetitorPriceMonitoringWithRepricingRecommendations from './pages/CfCompetitorPriceMonitoringWithRepricingRecommendations'
import CfCustomerLifetimeValuePredictionToGuideAcquisition from './pages/CfCustomerLifetimeValuePredictionToGuideAcquisition'
import CfMultiArmedBanditPreferenceLearningLoopFor from './pages/CfMultiArmedBanditPreferenceLearningLoopFor'
import CfLogisticsIntegratedAddressValidationAndLabelGeneration from './pages/CfLogisticsIntegratedAddressValidationAndLabelGeneration'
import GapAiEndpointsCoverTheCurationWorkflowWell from './pages/GapAiEndpointsCoverTheCurationWorkflowWell'
import GapNoVisionBasedProductImageQualityScoring from './pages/GapNoVisionBasedProductImageQualityScoring'
import GapNoConversationalBoxCustomizationChatbot from './pages/GapNoConversationalBoxCustomizationChatbot'
import GapNoMarketingEmailSequencesForOnboardingRetention from './pages/GapNoMarketingEmailSequencesForOnboardingRetention'
import GapNoIntegrationsWithLogisticsFulfillmentPlatformsShippo from './pages/GapNoIntegrationsWithLogisticsFulfillmentPlatformsShippo'
import GapNoReferralAffiliateTracking from './pages/GapNoReferralAffiliateTracking'
import GapNoPauseSkipSubscriptionFunctionality from './pages/GapNoPauseSkipSubscriptionFunctionality'
import GapNoGiftSubscriptionWorkflow from './pages/GapNoGiftSubscriptionWorkflow'
import GapNoWebhooksOrNotifications from './pages/GapNoWebhooksOrNotifications'
import GapNoAuditLogging from './pages/GapNoAuditLogging'
import GapNoPaymentProcessorIntegration from './pages/GapNoPaymentProcessorIntegration'

function ProtectedRoute({ children }) {
  // Wrapping app already gates on the `user` state below; this stub keeps batch-08 routes valid.
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="spinner-container" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-layout">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/subscription-boxes" element={<SubscriptionBoxes />} />
          <Route path="/subscription-boxes/:id" element={<BoxDetail />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/ai-center" element={<AICenter />} />
          <Route path="/ai/:feature" element={<AIFeaturePage />} />
          <Route path="/quiz" element={<QuizOnboarding />} />
          <Route path="/churn" element={<ChurnDashboard />} />
          <Route path="/custom-views" element={<CustomViewsPage />} />
          {/* // === Batch 08 Gaps & Frontend Mounts === */}
      <Route path="/cf-seasonal-demand-forecasting-for-inventory-spikes-around-holidays" element={<ProtectedRoute><CfSeasonalDemandForecastingForInventorySpikesAround /></ProtectedRoute>} />
      <Route path="/cf-unboxing-experience-optimization-with-ai-suggested-product-arrangement" element={<ProtectedRoute><CfUnboxingExperienceOptimizationWithAiSuggestedProduct /></ProtectedRoute>} />
      <Route path="/cf-competitor-price-monitoring-with-repricing-recommendations" element={<ProtectedRoute><CfCompetitorPriceMonitoringWithRepricingRecommendations /></ProtectedRoute>} />
      <Route path="/cf-customer-lifetime-value-prediction-to-guide-acquisition-spend" element={<ProtectedRoute><CfCustomerLifetimeValuePredictionToGuideAcquisition /></ProtectedRoute>} />
      <Route path="/cf-multi-armed-bandit-preference-learning-loop-for-product-discovery" element={<ProtectedRoute><CfMultiArmedBanditPreferenceLearningLoopFor /></ProtectedRoute>} />
      <Route path="/cf-logistics-integrated-address-validation-and-label-generation" element={<ProtectedRoute><CfLogisticsIntegratedAddressValidationAndLabelGeneration /></ProtectedRoute>} />
      <Route path="/gap-ai-endpoints-cover-the-curation-workflow-well" element={<ProtectedRoute><GapAiEndpointsCoverTheCurationWorkflowWell /></ProtectedRoute>} />
      <Route path="/gap-no-vision-based-product-image-quality-scoring" element={<ProtectedRoute><GapNoVisionBasedProductImageQualityScoring /></ProtectedRoute>} />
      <Route path="/gap-no-conversational-box-customization-chatbot" element={<ProtectedRoute><GapNoConversationalBoxCustomizationChatbot /></ProtectedRoute>} />
      <Route path="/gap-no-marketing-email-sequences-for-onboarding-retention" element={<ProtectedRoute><GapNoMarketingEmailSequencesForOnboardingRetention /></ProtectedRoute>} />
      <Route path="/gap-no-integrations-with-logistics-fulfillment-platforms-shippo-shipstation" element={<ProtectedRoute><GapNoIntegrationsWithLogisticsFulfillmentPlatformsShippo /></ProtectedRoute>} />
      <Route path="/gap-no-referral-affiliate-tracking" element={<ProtectedRoute><GapNoReferralAffiliateTracking /></ProtectedRoute>} />
      <Route path="/gap-no-pause-skip-subscription-functionality" element={<ProtectedRoute><GapNoPauseSkipSubscriptionFunctionality /></ProtectedRoute>} />
      <Route path="/gap-no-gift-subscription-workflow" element={<ProtectedRoute><GapNoGiftSubscriptionWorkflow /></ProtectedRoute>} />
      <Route path="/gap-no-webhooks-or-notifications" element={<ProtectedRoute><GapNoWebhooksOrNotifications /></ProtectedRoute>} />
      <Route path="/gap-no-audit-logging" element={<ProtectedRoute><GapNoAuditLogging /></ProtectedRoute>} />
      <Route path="/gap-no-payment-processor-integration" element={<ProtectedRoute><GapNoPaymentProcessorIntegration /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
