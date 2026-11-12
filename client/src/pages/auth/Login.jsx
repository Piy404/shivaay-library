import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export default function Login({ isAdminPortal = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { login, verifyTwoFactorLogin, loading } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const result = await login(email, password);
    if (!result.success) {
      setErrorMsg(result.error || 'Invalid credentials');
      return;
    }

    if (result.requires2FA) {
      setRequires2FA(true);
      return;
    }

    navigate(result.user?.role === 'ADMIN' ? '/admin' : '/portal');
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const result = await verifyTwoFactorLogin(totpCode);
    if (!result.success) {
      setErrorMsg(result.error || 'Invalid 2FA code');
      return;
    }
    navigate(result.user?.role === 'ADMIN' ? '/admin' : '/portal');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 justify-center">
          <BookOpen className="h-10 w-10 text-blue-600" />
          <span className="text-2xl font-bold text-slate-900">Shivaay Library</span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">
          {requires2FA
            ? 'Two-Factor Verification'
            : isAdminPortal
              ? 'Administrator Portal'
              : 'Sign in to Your Account'}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {!requires2FA && (
            <>
              New student?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200">
          {errorMsg && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}

          {!requires2FA ? (
            <form className="space-y-5" onSubmit={handleLoginSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-blue-600 hover:text-blue-500"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleTwoFactorSubmit}>
              <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
                <ShieldCheck className="shrink-0" size={20} />
                <span>Enter the 6-digit code from your authenticator app or a backup code.</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Authentication Code
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-center tracking-widest font-mono text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123456"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRequires2FA(false);
                    setTotpCode('');
                    setErrorMsg('');
                  }}
                  className="w-1/3 py-2.5 px-4 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
