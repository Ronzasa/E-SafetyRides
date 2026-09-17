import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import MyReports from './pages/MyReports';
import AdminReportQueue from './pages/AdminReportQueue';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/my-reports" element={<ProtectedRoute><MyReports /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute adminOnly><AdminReportQueue /></ProtectedRoute>} />
          <Route path="/admin/trends" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;