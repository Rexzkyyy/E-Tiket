import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import PublicTicket from './pages/PublicTicket';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Halaman Publik untuk Pengunjung */}
        <Route path="/t/:barcode" element={<PublicTicket />} />
        
        {/* Halaman Login */}
        <Route path="/login" element={<Login />} />
        
        {/* Halaman Khusus Admin/Panitia */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        
        {/* Redirect root ke admin (yang sekarang diproteksi) */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        
        {/* Catch all - 404 */}
        <Route path="*" element={<div style={{ textAlign: 'center', padding: '50px' }}>404 - Halaman Tidak Ditemukan</div>} />
      </Routes>
    </Router>
  );
};

export default App;
