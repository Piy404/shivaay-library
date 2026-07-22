import { ArrowRight, CheckCircle, Wifi, Wind, BookOpen, Clock, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-white pt-20 pb-24 md:pt-32 md:pb-36 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            Open Daily: 6 AM to 11 PM
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight max-w-4xl mx-auto mb-6">
            A Premium Silent Study Space for Serious Aspirants.
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            120-seat fully air-conditioned library designed for absolute focus. Equip yourself with high-speed Wi-Fi, ergonomic seating, and a distraction-free environment in Bhopal.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link to="/contact" className="px-8 py-3.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
              Book Your Seat <ArrowRight size={18} />
            </Link>
            <Link to="/membership" className="px-8 py-3.5 bg-white text-slate-700 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition-colors">
              View Pricing Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Stats / Overview Section */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Total Capacity', value: '120 Seats', icon: Users },
              { label: 'Daily Access', value: '17 Hours', icon: Clock },
              { label: 'Internet Speed', value: '300 Mbps', icon: Wifi },
              { label: 'Security', value: '24/7 CCTV', icon: ShieldCheck },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100 mb-4 text-blue-600">
                  <stat.icon size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</h3>
                <p className="text-slate-500 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Professional Infrastructure</h2>
            <p className="text-lg text-slate-600">Everything you need to maintain long hours of focused study without fatigue or interruption.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Strictly Silent Zone',
                desc: 'A well-maintained noise-free environment ensuring zero distractions for competitive exam preparation.',
                icon: BookOpen
              },
              {
                title: 'Ergonomic Workstations',
                desc: 'Spacious desks with comfortable, posture-supporting chairs designed for 10+ hours of continuous sitting.',
                icon: CheckCircle
              },
              {
                title: 'Fully Air Conditioned',
                desc: 'Optimal temperature control across all study halls providing a comfortable environment year-round.',
                icon: Wind
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-100 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                  <feature.icon size={20} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership Preview */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Straightforward Pricing</h2>
          <p className="text-slate-400 mb-12 max-w-2xl mx-auto">Choose a plan that fits your study schedule. No hidden fees, no complicated contracts.</p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Simple Card 1 */}
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 text-left flex flex-col">
              <h3 className="text-xl font-semibold mb-2">Monthly Pass</h3>
              <div className="text-3xl font-bold mb-6">₹1,200<span className="text-base font-normal text-slate-400">/mo</span></div>
              <ul className="space-y-4 mb-8 flex-grow text-slate-300">
                <li className="flex items-center gap-3"><CheckCircle size={18} className="text-blue-400" /> Full day access (6 AM - 11 PM)</li>
                <li className="flex items-center gap-3"><CheckCircle size={18} className="text-blue-400" /> Reserved seating</li>
                <li className="flex items-center gap-3"><CheckCircle size={18} className="text-blue-400" /> High-speed WiFi</li>
              </ul>
              <Link to="/contact" className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white text-center rounded-lg font-medium transition-colors">
                Enquire Now
              </Link>
            </div>
            
            {/* Featured Card */}
            <div className="bg-blue-600 rounded-2xl p-8 border border-blue-500 text-left flex flex-col transform md:-translate-y-4 shadow-xl">
              <div className="text-blue-100 text-sm font-semibold uppercase tracking-wider mb-2">Most Popular</div>
              <h3 className="text-xl font-semibold mb-2">Quarterly Pass</h3>
              <div className="text-3xl font-bold mb-6">₹3,200<span className="text-base font-normal text-blue-200">/3 mos</span></div>
              <ul className="space-y-4 mb-8 flex-grow text-blue-50">
                <li className="flex items-center gap-3"><CheckCircle size={18} className="text-white" /> Save ₹400 compared to monthly</li>
                <li className="flex items-center gap-3"><CheckCircle size={18} className="text-white" /> Full day access (6 AM - 11 PM)</li>
                <li className="flex items-center gap-3"><CheckCircle size={18} className="text-white" /> Reserved premium seating</li>
                <li className="flex items-center gap-3"><CheckCircle size={18} className="text-white" /> High-speed WiFi</li>
              </ul>
              <Link to="/contact" className="w-full py-3 bg-white text-blue-700 hover:bg-blue-50 text-center rounded-lg font-medium transition-colors">
                Enquire Now
              </Link>
            </div>

            {/* Simple Card 2 */}
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 text-left flex flex-col">
              <h3 className="text-xl font-semibold mb-2">Half-Yearly</h3>
              <div className="text-3xl font-bold mb-6">₹6,000<span className="text-base font-normal text-slate-400">/6 mos</span></div>
              <ul className="space-y-4 mb-8 flex-grow text-slate-300">
                <li className="flex items-center gap-3"><CheckCircle size={18} className="text-blue-400" /> Save ₹1,200 annually</li>
                <li className="flex items-center gap-3"><CheckCircle size={18} className="text-blue-400" /> Full day access (6 AM - 11 PM)</li>
                <li className="flex items-center gap-3"><CheckCircle size={18} className="text-blue-400" /> Reserved seating</li>
              </ul>
              <Link to="/contact" className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white text-center rounded-lg font-medium transition-colors">
                Enquire Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Ready to upgrade your study routine?</h2>
          <p className="text-lg text-slate-600 mb-8">Visit us today for a free tour of the facility and experience the environment yourself.</p>
          <div className="flex justify-center gap-4">
            <Link to="/contact" className="px-8 py-3.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Get Directions
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
