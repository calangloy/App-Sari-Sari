import { useState } from 'react';
import { Database, Shield, Bell, Smartphone, User, Save, Loader2, RefreshCw } from 'lucide-react';
import { dbService } from '../lib/db';
import { serverTimestamp } from 'firebase/firestore';

export const SettingsView = () => {
  const [isSeeding, setIsSeeding] = useState(false);

  const seedDatabase = async () => {
    setIsSeeding(true);
    try {
      // Seed Products
      const products = [
        { barcode: '123456789', name: 'Piattos Cheese 40g', costPrice: 12, sellingPrice: 15, stockLevel: 24, category: 'Snacks', supplierId: 'S1' },
        { barcode: '987654321', name: 'Coke 1.5L', costPrice: 65, sellingPrice: 75, stockLevel: 10, category: 'Beverages', supplierId: 'S1' },
        { barcode: '112233445', name: 'Bear Brand 33g', costPrice: 14, sellingPrice: 16, stockLevel: 50, category: 'Milk', supplierId: 'S2' },
      ];

      for (const p of products) {
        await dbService.add('products', { ...p, updatedAt: serverTimestamp() });
      }

      // Seed Suppliers
      const suppliers = [
        { name: 'Mega Beverages Inc.', contactPerson: 'John Smith', phone: '09123334444', email: 'sales@megabev.com' },
        { name: 'Valley Snacks Corp.', contactPerson: 'Jane Doe', phone: '09224445555', email: 'orders@valleysnacks.ph' },
      ];

      for (const s of suppliers) {
        await dbService.add('suppliers', s);
      }

      alert("Database seeded successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to seed database. Check console for details.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Database size={18} className="text-blue-500" />
            Database & System
          </h2>
        </div>
        <div className="p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900">Seed Initial Data</h3>
              <p className="text-sm text-slate-500">Populate your inventory and suppliers with sample data for testing.</p>
            </div>
            <button 
              onClick={seedDatabase}
              disabled={isSeeding}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-all font-bold text-xs uppercase tracking-wider disabled:opacity-50"
            >
              {isSeeding ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              {isSeeding ? 'Seeding...' : 'Seed Data'}
            </button>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900">Cloud Backup</h3>
              <p className="text-sm text-slate-500">Automatically sync transactions to secure backup servers.</p>
            </div>
            <div className="flex items-center gap-2 text-green-600 text-xs font-black uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Active
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Shield size={18} className="text-blue-500" />
            Security & Access
          </h2>
        </div>
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Store Manager PIN</label>
              <input 
                type="password" 
                defaultValue="••••"
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Auto-Logout Timer</label>
              <select className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>15 Minutes of Inactivity</option>
                <option>30 Minutes of Inactivity</option>
                <option>1 Hour of Inactivity</option>
                <option>Never</option>
              </select>
            </div>
          </div>
          
          <button className="bg-slate-900 text-white w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">
            Save Security Policy
          </button>
        </div>
      </div>
    </div>
  );
};
