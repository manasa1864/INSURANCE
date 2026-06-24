// Top-level router — defines all routes and which ones need the authenticated layout shell.
// Public pages (landing, auth, learn-more, admin) render on their own.
// Everything inside <Layout /> is a protected route that requires login.

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Layout } from './components/layout/Layout';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { WizardLayout } from './pages/NewRecommendation/WizardLayout';
import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { ComparePolicies } from './pages/ComparePolicies';
import { WhatIfSimulator } from './pages/WhatIfSimulator';
import { SavedPlans } from './pages/SavedPlans';
import { Reports } from './pages/Reports';
import { HelpSupport } from './pages/HelpSupport';
import { Settings } from './pages/Settings';
import { LearnMore } from './pages/LearnMore';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/learn-more" element={<LearnMore />} />
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Protected Routes */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new-recommendation" element={<WizardLayout />} />
          <Route path="/compare" element={<ComparePolicies />} />
          <Route path="/whatif" element={<WhatIfSimulator />} />
          <Route path="/saved" element={<SavedPlans />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/support" element={<HelpSupport />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;