import { CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Membership() {
  const plans = [
    {
      name: "Monthly Pass",
      price: "1,200",
      duration: "1 Month",
      features: ["Full day access (6 AM - 11 PM)", "Reserved seating", "High-speed WiFi", "AC Hall"],
      popular: false
    },
    {
      name: "Quarterly Pass",
      price: "3,200",
      duration: "3 Months",
      features: ["Save ₹400", "Full day access (6 AM - 11 PM)", "Reserved premium seating", "High-speed WiFi", "AC Hall"],
      popular: true
    },
    {
      name: "Half-Yearly",
      price: "6,000",
      duration: "6 Months",
      features: ["Save ₹1,200", "Full day access (6 AM - 11 PM)", "Reserved premium seating", "High-speed WiFi", "AC Hall"],
      popular: false
    }
  ];

  return (
    <div className="py-20 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-lg text-slate-600">Choose the duration that fits your exam timeline. All plans include full access to our premium facilities.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div key={i} className={`bg-white rounded-2xl p-8 border ${plan.popular ? 'border-blue-500 shadow-lg relative transform md:-translate-y-4' : 'border-slate-200 shadow-sm'} flex flex-col`}>
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold tracking-wide">
                  MOST POPULAR
                </div>
              )}
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{plan.name}</h3>
              <div className="text-4xl font-bold text-slate-900 mb-6">
                ₹{plan.price}<span className="text-base font-normal text-slate-500">/{plan.duration}</span>
              </div>
              <ul className="space-y-4 mb-8 flex-grow">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3 text-slate-700">
                    <CheckCircle size={18} className="text-blue-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link to="/contact" className={`w-full py-3 text-center rounded-lg font-medium transition-colors ${
                plan.popular 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
              }`}>
                Join Now
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
