import { Clock, Users, ShieldCheck } from 'lucide-react';

export default function About() {
  return (
    <div className="py-20 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-8 text-center">About Shivaay Library</h1>
        
        <div className="prose prose-lg text-slate-600 mx-auto mb-16">
          <p className="lead text-xl mb-6">
            Shivaay Library is Bhopal's premier silent study environment, dedicated to providing competitive exam aspirants and professionals with the ultimate distraction-free zone.
          </p>
          <p className="mb-6">
            We understand that success requires intense focus, which is impossible in crowded cafes or noisy homes. That's why we've engineered a space where discipline and quiet are the top priorities.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="text-blue-600" /> Opening Timings
            </h3>
            <ul className="space-y-3 text-slate-600">
              <li className="flex justify-between border-b border-slate-200 pb-2">
                <span>Monday - Sunday</span>
                <span className="font-medium text-slate-900">6:00 AM - 11:00 PM</span>
              </li>
              <li className="text-sm text-slate-500 pt-2">
                * Open on all public holidays.
              </li>
            </ul>
          </div>

          <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="text-blue-600" /> Facility Details
            </h3>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                120 Seating Capacity
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                Separate washrooms
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                Pantry area for lunch
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-blue-600 text-white rounded-2xl p-8 md:p-12 text-center">
          <ShieldCheck className="w-12 h-12 mx-auto mb-6 text-blue-200" />
          <h2 className="text-2xl font-bold mb-4">Why Students Choose Us?</h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            "The strict no-talking policy and extremely comfortable chairs make it possible to sit for 10 hours straight without realizing it."
          </p>
        </div>
      </div>
    </div>
  );
}
