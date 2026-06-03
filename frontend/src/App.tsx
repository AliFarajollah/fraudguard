import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ScorePage } from './pages/ScorePage';
import { TransactionsPage } from './pages/TransactionsPage';
import { TransactionDetailPage } from './pages/TransactionDetailPage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { PendingApprovalPage } from './pages/PendingApprovalPage';

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />

          {/* All authenticated users */}
          <Route path="/analytics" element={
            <ProtectedRoute><AnalyticsPage /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/transactions" element={
            <ProtectedRoute><TransactionsPage /></ProtectedRoute>
          } />
          <Route path="/transactions/:id" element={
            <ProtectedRoute><TransactionDetailPage /></ProtectedRoute>
          } />
          <Route path="/reviews" element={
            <ProtectedRoute><ReviewQueuePage /></ProtectedRoute>
          } />

          {/* analyst + admin only */}
          <Route path="/score" element={
            <ProtectedRoute allowedRoles={['admin', 'analyst']}>
              <ScorePage />
            </ProtectedRoute>
          } />

          {/* admin only */}
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminUsersPage />
            </ProtectedRoute>
          } />

          {/* Fallbacks */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;