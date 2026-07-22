import { useEffect, useState } from 'react';
import { Users, CreditCard, AlertCircle, TrendingUp } from 'lucide-react';
import api from '../../utils/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeMemberships: 0,
    totalCollection: 0,
    pendingFeesCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/admin/stats');
        setStats(data);
      } catch (error) {
        console.error("Failed to load stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="text-slate-500">Loading dashboard...</div>;

  const statCards = [
    { title: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Active Memberships', value: stats.activeMemberships, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Total Collection (This Month)', value: `₹${stats.totalCollection}`, icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-100' },
    { title: 'Pending Fees', value: stats.pendingFeesCount, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors">
            Add New Student
          </button>
          <button className="px-4 py-2 bg-slate-50 text-slate-700 rounded-lg font-medium border border-slate-200 hover:bg-slate-100 transition-colors">
            Generate Fee Report
          </button>
        </div>
      </div>
    </div>
  );
}
