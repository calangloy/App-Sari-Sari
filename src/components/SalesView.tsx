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

  const exportToCSV = () => {
    if (filteredSales.length === 0) return;
    
    const headers = ["Order ID", "Date", "Payment Method", "Items", "Subtotal", "Tax", "Total"];
    const rows = filteredSales.map(sale => [
      sale.orderId || sale.id,
      sale.timestamp ? format((sale.timestamp as Timestamp).toDate(), 'yyyy-MM-dd HH:mm') : 'N/A',
      sale.paymentMethod,
      `"${sale.items.map(i => `${i.name} (x${i.quantity})`).join('|')}"`,
      sale.subtotal || 0,
      sale.tax || 0,
      sale.total || 0
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-display">Sales Analytics</h1>
          <p className="text-slate-500 font-medium">Track your store's financial performance</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={16} />
            Export Data
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm group hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <TrendingUp size={28} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-green-500 bg-green-50 px-3 py-1 rounded-full">
              +12.5% 
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gross Revenue</p>
          <h3 className="text-4xl font-black text-slate-900 mt-1 font-display tracking-tight leading-none">{formatCurrency(totalRevenue)}</h3>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all hover:border-blue-200">
          <div className="flex items-center justify-between mb-6">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <ShoppingBag size={28} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transactions</p>
          <h3 className="text-4xl font-black text-slate-900 mt-1 font-display tracking-tight leading-none">{totalOrders}</h3>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all hover:border-blue-200">
          <div className="flex items-center justify-between mb-6">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
              <Calendar size={28} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Average Basket</p>
          <h3 className="text-4xl font-black text-slate-900 mt-1 font-display tracking-tight leading-none">{formatCurrency(avgOrderValue)}</h3>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden transition-colors">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50">
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
            {(['today', '7d', '30d', 'all'] as const).map((id) => (
              <button
                key={id}
                onClick={() => setDateFilter(id)}
                className={cn(
                  "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  dateFilter === id 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {id === 'today' ? 'Today' : id === '7d' ? 'Week' : id === '30d' ? 'Month' : 'Lifetime'}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search Order ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 pl-12 pr-6 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-80 font-bold text-slate-900 shadow-inner"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Sale Reference</th>
                <th className="px-8 py-5">Settlement</th>
                <th className="px-8 py-5">Basket Details</th>
                <th className="px-8 py-5 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="animate-spin text-blue-500" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest">Decrypting records...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center gap-4 opacity-50">
                      <BarChart3 size={48} strokeWidth={1} />
                      <p className="text-[10px] font-black uppercase tracking-widest">No transaction history discovered</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-bold text-slate-900 text-base font-display">#{sale.orderId || sale.id.slice(0, 10)}</div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-tight mt-1">
                        {sale.timestamp ? format((sale.timestamp as Timestamp).toDate(), 'MMM dd, yyyy • hh:mm aa') : 'Processing'}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-colors",
                        sale.paymentMethod === 'cash' ? "bg-green-50 text-green-700 border-green-100" :
                        sale.paymentMethod === 'card' ? "bg-blue-50 text-blue-700 border-blue-100" :
                        "bg-indigo-50 text-indigo-700 border-indigo-100"
                      )}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-slate-700">
                        {sale.items.length} Product{sale.items.length !== 1 ? 's' : ''}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium truncate max-w-[200px] uppercase italic">
                        {sale.items.map(i => i.name).join(', ')}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="font-black text-slate-900 text-lg font-mono">{formatCurrency(sale.total)}</div>
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
