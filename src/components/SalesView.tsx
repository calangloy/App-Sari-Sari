import { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Calendar,
  Filter,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import { useCollection } from '../lib/db';
import { Sale } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { orderBy, Timestamp } from 'firebase/firestore';
import { format, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';

export const SalesView = () => {
  const { data: sales, loading } = useCollection<Sale>('sales', orderBy('timestamp', 'desc'));
  const [dateFilter, setDateFilter] = useState<'today' | '7d' | '30d' | 'all'>('today');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSales = sales.filter(sale => {
    // If timestamp is not yet set by server, treat as 'now' for filtering
    const saleDate = sale.timestamp ? (sale.timestamp as Timestamp).toDate() : new Date();
    const now = new Date();

    let isInDateRange = true;
    if (dateFilter === 'today') {
      isInDateRange = saleDate >= startOfDay(now);
    } else if (dateFilter === '7d') {
      isInDateRange = saleDate >= startOfDay(subDays(now, 7));
    } else if (dateFilter === '30d') {
      isInDateRange = saleDate >= startOfDay(subDays(now, 30));
    }

    const matchesSearch = sale.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (sale.orderId && sale.orderId.toLowerCase().includes(searchTerm.toLowerCase()));

    return isInDateRange && matchesSearch;
  });

  const totalRevenue = filteredSales.reduce((acc, current) => acc + (current.total || 0), 0);
  const totalOrders = filteredSales.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Sales Analytics</h1>
          <p className="text-slate-500 font-medium">Track your store's financial performance</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-all">
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-green-500 bg-green-50 px-2.5 py-1 rounded-full">
              +12.5%
            </span>
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Revenue</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">{formatCurrency(totalRevenue)}</h3>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <ShoppingBag size={24} />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Transactions</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">{totalOrders}</h3>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
              <Calendar size={24} />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Avg. Order Value</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">{formatCurrency(avgOrderValue)}</h3>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['today', '7d', '30d', 'all'] as const).map((id) => (
              <button
                key={id}
                onClick={() => setDateFilter(id)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                  dateFilter === id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {id === '7d' ? 'Last 7 Days' : id === '30d' ? 'Last 30 Days' : id}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search Order ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-100 pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Transaction Details</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="animate-spin inline mr-2" size={20} />
                    Loading sale records...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No transactions found for this period.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm">#{sale.orderId || sale.id.slice(0, 8)}</div>
                      <div className="text-xs text-slate-500 font-medium">
                        {sale.timestamp ? format((sale.timestamp as Timestamp).toDate(), 'MMM dd, yyyy • hh:mm aa') : 'Pending'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                        sale.paymentMethod === 'cash' ? "bg-green-100 text-green-600" :
                        sale.paymentMethod === 'card' ? "bg-blue-100 text-blue-600" :
                        "bg-purple-100 text-purple-600"
                      )}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-600">
                        {sale.items.length} item(s)
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold truncate max-w-[150px]">
                        {sale.items.map(i => i.name).join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-black text-slate-900">{formatCurrency(sale.total)}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
