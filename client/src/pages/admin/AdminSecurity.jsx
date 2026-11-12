import { useEffect, useState } from 'react';
import { ShieldCheck, KeyRound, Settings, FileText } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/useAuth';

export default function AdminSecurity() {
  const { user, refreshUser } = useAuth();
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [disableForm, setDisableForm] = useState({ password: '', code: '' });
  const [settings, setSettings] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const totpEnabled = Boolean(user?.adminProfile?.totpEnabled);

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsRes, logsRes] = await Promise.all([
          api.get('/settings/public'),
          api.get('/admin/audit-logs?limit=15'),
        ]);
        setSettings(settingsRes.data);
        setAuditLogs(logsRes.data.logs || []);
      } catch (err) {
        console.error('Failed to load security panel data', err);
      }
    };
    load();
  }, []);

  const handleStart2FA = async () => {
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setSetupData(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to start 2FA setup');
    }
  };

  const handleEnable2FA = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/2fa/enable', {
        secret: setupData.secret,
        code: verifyCode,
      });
      setBackupCodes(data.backupCodes || []);
      setSetupData(null);
      setVerifyCode('');
      setMessage(data.message);
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/auth/2fa/disable', disableForm);
      setDisableForm({ password: '', code: '' });
      setMessage(data.message);
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to disable 2FA');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const { data } = await api.put('/settings', {
        libraryName: settings.libraryName,
        totalSeats: Number(settings.totalSeats),
        openingTime: settings.openingTime,
        closingTime: settings.closingTime,
        openDays: settings.openDays,
      });
      setSettings(data);
      setMessage('Library capacity and operating hours updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Security, 2FA & Configuration</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage administrator two-factor authentication, library capacity/hours, and security audit logs.
        </p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2FA Management */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <ShieldCheck className="text-blue-600" size={20} />
            Two-Factor Authentication (TOTP)
          </h2>

          <div className="mb-4">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                totpEnabled ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {totpEnabled ? '2FA Enabled' : '2FA Disabled'}
            </span>
          </div>

          {!totpEnabled && !setupData && (
            <button
              onClick={handleStart2FA}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <KeyRound size={16} /> Configure Authenticator App
            </button>
          )}

          {setupData && (
            <form onSubmit={handleEnable2FA} className="space-y-4">
              <p className="text-sm text-slate-600">
                Scan this QR code in Google Authenticator, Authy, or 1Password, then enter the 6-digit code.
              </p>
              <img
                src={setupData.qrCodeDataUrl}
                alt="2FA QR Code"
                className="w-44 h-44 border border-slate-200 rounded-lg p-2 bg-white"
              />
              <p className="text-xs text-slate-500 font-mono break-all">
                Secret: {setupData.secret}
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  required
                  placeholder="6-digit code"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono w-40"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Verify & Enable
                </button>
              </div>
            </form>
          )}

          {backupCodes.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-900 mb-2">
                Save these single-use backup codes in a safe place (shown once):
              </p>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs text-amber-950">
                {backupCodes.map((c) => (
                  <span key={c} className="bg-white px-2 py-1 rounded border border-amber-200">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {totpEnabled && (
            <form onSubmit={handleDisable2FA} className="space-y-3 mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">Disable 2FA (requires password + current TOTP code):</p>
              <input
                type="password"
                required
                placeholder="Current password"
                value={disableForm.password}
                onChange={(e) => setDisableForm({ ...disableForm, password: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <input
                type="text"
                required
                placeholder="6-digit 2FA code"
                value={disableForm.code}
                onChange={(e) => setDisableForm({ ...disableForm, code: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Disable 2FA
              </button>
            </form>
          )}
        </div>

        {/* Library Capacity & Hours Config */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Settings className="text-blue-600" size={20} />
            Capacity & Operating Hours
          </h2>
          {settings && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total Seat Capacity
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={settings.totalSeats}
                  onChange={(e) => setSettings({ ...settings, totalSeats: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Opening Time</label>
                  <input
                    type="time"
                    value={settings.openingTime}
                    onChange={(e) => setSettings({ ...settings, openingTime: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Closing Time</label>
                  <input
                    type="time"
                    value={settings.closingTime}
                    onChange={(e) => setSettings({ ...settings, closingTime: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Open Days</label>
                <input
                  type="text"
                  value={settings.openDays}
                  onChange={(e) => setSettings({ ...settings, openDays: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Save Configuration
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center gap-2">
          <FileText className="text-blue-600" size={20} />
          <h2 className="text-lg font-semibold text-slate-900">Recent Security & Audit Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">Actor</th>
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">Entity</th>
                <th className="px-6 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-slate-500">
                    No audit events recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-slate-900">{log.actorEmail || 'System'}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-xs font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{log.entityType}</td>
                    <td className="px-6 py-3 text-slate-500 font-mono text-xs">{log.ipAddress || '--'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
