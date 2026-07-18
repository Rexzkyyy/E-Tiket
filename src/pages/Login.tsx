import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Email atau password salah!');
      setLoading(false);
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className="login-container">
      <div className="bg-aurora-1"></div>
      <div className="bg-aurora-2"></div>

      <div className="login-card">
        <div className="login-header">
          <ShieldCheck size={48} color="#0f172a" />
          <h2>Akses Admin</h2>
          <p>Login dengan email yang diberikan</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan email"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: #f8fafc;
          overflow: hidden;
        }
        .login-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(16px);
          padding: 2.5rem;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          width: 100%;
          max-width: 400px;
          position: relative;
          z-index: 10;
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .login-header h2 {
          font-size: 1.8rem;
          color: #0f172a;
          margin: 1rem 0 0.5rem;
          font-weight: 800;
        }
        .login-header p {
          color: #64748b;
          font-size: 0.95rem;
        }
        .login-form .input-group {
          margin-bottom: 1.5rem;
        }
        .login-form label {
          display: block;
          margin-bottom: 0.5rem;
          color: #334155;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .input-with-icon {
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        .login-form input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .login-form input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .error-message {
          color: #ef4444;
          background: #fef2f2;
          padding: 10px;
          border-radius: 8px;
          font-size: 0.85rem;
          text-align: center;
          border: 1px solid #fee2e2;
        }
      `}</style>
    </div>
  );
};

export default Login;
