import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

export default function FeeStatus() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const { data } = await api.get('/fees/myfees');
        setFees(data);
      } catch (error) {
        console.error('Error fetching fees', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFees();
  }, []);

  const getStatusIcon = (status) => {
    switch(status) {
      case 'paid': return <CheckCircle className="text-green-500" size={20} />;
      case 'pending': return <Clock className="text-yellow-500" size={20} />;
      case 'overdue': return <AlertCircle className="text-red-500" size={20} />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'paid': return <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Paid</span>;
      case 'pending': return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Pending</span>;
      case 'overdue': return <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Overdue</span>;
      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link to="/portal" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Fee Status & History</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="px-6 py-4 font-medium">Month/Period</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Payment Date</th>
                <th className="px-6 py-4 font-medium">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-6 text-center text-slate-500">Loading fee history...</td></tr>
              ) : fees.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-slate-500">No fee records found.</td></tr>
              ) : (
                fees.map((fee) => (
                  <tr key={fee._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{fee.month}</td>
                    <td className="px-6 py-4 text-slate-900">₹{fee.amount}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(fee.status)}
                        {getStatusBadge(fee.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {fee.paymentDate ? new Date(fee.paymentDate).toLocaleDateString() : '--'}
                    </td>
                    <td className="px-6 py-4 text-slate-600 capitalize">
                      {fee.paymentMethod || '--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            Note: Fees are to be paid by the 5th of every month. For manual payment updates, please contact the library admin at the front desk.
          </p>
        </div>
      </div>
    </div>
  );
}
