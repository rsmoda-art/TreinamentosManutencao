/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import EmployeeManagement from './components/EmployeeManagement';
import TrainingMatrix from './components/TrainingMatrix';
import Schedule from './components/Schedule';
import Profile from './components/Profile';
import BulkEdit from './components/BulkEdit';
import Auth from './components/Auth';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isBulkEditing, setIsBulkEditing] = useState(false);

  const renderContent = () => {
    if (isBulkEditing) {
      return <BulkEdit onCancel={() => setIsBulkEditing(false)} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onTabChange={setActiveTab} onBulkEdit={() => setIsBulkEditing(true)} />;
      case 'employees':
        return <EmployeeManagement onBulkEdit={() => setIsBulkEditing(true)} />;
      case 'schedule':
        return <Schedule />;
      case 'settings':
        return <TrainingMatrix />;
      default:
        return <Dashboard onTabChange={setActiveTab} onBulkEdit={() => setIsBulkEditing(true)} />;
    }
  };

  return (
    <ErrorBoundary>
      <Auth>
        {() => (
          <Layout activeTab={activeTab} onTabChange={setActiveTab}>
            {renderContent()}
          </Layout>
        )}
      </Auth>
    </ErrorBoundary>
  );
}
