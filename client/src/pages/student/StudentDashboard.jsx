import { useAuth } from '../../context/AuthContext';
import { User, CreditCard, Calendar, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Welcome, {user?.name}</h1>
        <Link to="/portal/fees" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
          <CreditCard size={18} />
          View Fee Status
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <User className="text-blue-600" /> Member Profile
            </h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Email</p>
                <p className="text-slate-900">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Phone</p>
                <p className="text-slate-900">{user?.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Member Since</p>
                <p className="text-slate-900">{user?.joinDate ? new Date(user.joinDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Status</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  user?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user?.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-blue-600 rounded-xl shadow-md text-white p-6">
            <h2 className="text-lg font-medium text-blue-100 mb-4 flex items-center gap-2">
              <MapPin size={20} /> Assigned Seat
            </h2>
            <div className="text-5xl font-bold text-center py-4">
              {user?.seatNumber || '--'}
            </div>
            <p className="text-center text-blue-200 text-sm mt-2">
              Please occupy only your assigned seat.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="text-blue-600" size={20} /> Current Plan
            </h2>
            <div className="font-semibold text-slate-900 text-lg capitalize">
              {user?.membershipPlan || 'None'}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock size={16} /> Open: 6 AM - 11 PM
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
