import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';

// Public Pages (Rule 0-C)
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import BlogPublic from './pages/BlogPublic';

// Authenticated ERP Pages
import Home from './pages/Home';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Matters from './pages/Matters';
import MatterDetail from './pages/MatterDetail';
import Tasks from './pages/Tasks';
import Hearings from './pages/Hearings';
import Documents from './pages/Documents';
import ContractsHub from './pages/ContractsHub';
import ComplianceHub from './pages/ComplianceHub';
import ArbitrationHub from './pages/ArbitrationHub';
import Inquiries from './pages/Inquiries';
import ConflictChecks from './pages/ConflictChecks';
import Consultations from './pages/Consultations';
import WhatsAppInbox from './pages/WhatsAppInbox';
import LegalWebsites from './pages/LegalWebsites';
import LegalResearch from './pages/LegalResearch';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import TimeEntries from './pages/TimeEntries';
import SubscriptionBilling from './pages/SubscriptionBilling';
import AIAssistant from './pages/AIAssistant';
import AILegalTools from './pages/AILegalTools';
import KnowledgeBase from './pages/KnowledgeBase';
import WidgetsAndIntegrations from './pages/WidgetsAndIntegrations';
import ReportsAnalytics from './pages/ReportsAnalytics';
import BlogAdmin from './pages/BlogAdmin';
import LawyerProfile from './pages/LawyerProfile';
import NotificationsPage from './pages/NotificationsPage';
import Settings from './pages/Settings';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/landing" replace />;
  }
  return <>{children}</>;
}

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? '/home' : '/landing'} replace />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes — NO Auth Guard */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route path="/blog" element={<BlogPublic />} />
            <Route path="/blog/:slug" element={<BlogPublic />} />

            {/* Authenticated ERP Routes */}
            <Route
              element={
                <RequireAuth>
                  <MainLayout />
                </RequireAuth>
              }
            >
              <Route path="/home" element={<Home />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/matters" element={<Matters />} />
              <Route path="/cases" element={<Matters />} />
              <Route path="/matters/:id" element={<MatterDetail />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/hearings" element={<Hearings />} />
              <Route path="/calendar" element={<Hearings />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/documents/:id" element={<Documents />} />
              <Route path="/contracts" element={<ContractsHub />} />
              <Route path="/compliance" element={<ComplianceHub />} />
              <Route path="/arbitration" element={<ArbitrationHub />} />
              <Route path="/whatsapp" element={<WhatsAppInbox />} />
              <Route path="/inquiries" element={<Inquiries />} />
              <Route path="/conflict-checks" element={<ConflictChecks />} />
              <Route path="/consultations" element={<Consultations />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/billing" element={<Invoices />} />
              <Route path="/invoices/:id" element={<Invoices />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/time-entries" element={<TimeEntries />} />
              <Route path="/subscription" element={<SubscriptionBilling />} />
              <Route path="/ai-legal" element={<AILegalTools />} />
              <Route path="/ai-intelligence" element={<AILegalTools />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="/assistant" element={<AIAssistant />} />
              <Route path="/legal-research" element={<LegalResearch />} />
              <Route path="/legal-library" element={<LegalResearch />} />
              <Route path="/legal-websites" element={<LegalWebsites />} />
              <Route path="/knowledge-base" element={<KnowledgeBase />} />
              <Route path="/knowledge-base/settings" element={<KnowledgeBase />} />
              <Route path="/widget-gallery" element={<WidgetsAndIntegrations />} />
              <Route path="/my-widgets" element={<WidgetsAndIntegrations />} />
              <Route path="/integrations" element={<WidgetsAndIntegrations />} />
              <Route path="/blog-admin" element={<BlogAdmin />} />
              <Route path="/lawyer-profile" element={<LawyerProfile />} />
              <Route path="/reports" element={<ReportsAnalytics />} />
              <Route path="/analytics" element={<ReportsAnalytics />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/voice-settings" element={<Settings />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
