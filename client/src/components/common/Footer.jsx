import { BookOpen, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4 text-white">
              <BookOpen className="h-6 w-6 text-blue-500" />
              <span className="font-bold text-xl">Shivaay Library</span>
            </Link>
            <p className="text-sm leading-relaxed text-slate-400 max-w-sm">
              Your dream deserves the right environment. A peaceful, premium space in Bhopal meticulously designed to foster focus, discipline, and ultimate success.
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-blue-400 transition-colors">About Us</Link></li>
              <li><Link to="/membership" className="hover:text-blue-400 transition-colors">Pricing Plans</Link></li>
              <li><Link to="/contact" className="hover:text-blue-400 transition-colors">Contact</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Info</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-slate-500 shrink-0" />
                <span>Plot No. 1, Sterling Globe, Hanuman Nagar, Jatkhedi, Bhopal, MP 462047</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                <span>+91 9993165583</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Shivaay Library. All rights reserved.</p>
          <Link to="/admin/login" className="hover:text-white mt-4 md:mt-0 transition-colors">Admin Portal</Link>
        </div>
      </div>
    </footer>
  );
}
