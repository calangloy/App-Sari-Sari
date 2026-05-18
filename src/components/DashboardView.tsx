import { 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Loader2
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { useCollection } from '../lib/db';
import { Product, Sale } from '../types';
import { orderBy, limit, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

export const DashboardView = () => {
  const { data: sales, loading: salesLoading } = useCollection<Sale>('sales', orderBy('timestamp', 'desc'));
  const { data: products, loading: productsLoading } = useCollection<Product>('products');
  const { data: customers, loading: customersLoading } = useCollection<any>('customers');

  if (salesLoading || productsLoading || customersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  // Basic calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysSales = sales.filter(s => {
    const date = (s.timestamp as any as Timestamp)?.toDate();
    return date >= today;
  });

  const totalRevenueToday = todaysSales.reduce((sum, s) => sum + s.total, 0);
  const lowStockCount = products.filter(p => p.stockLevel <= 5).length;

  const stats = [
    { label: 'Total Sales (Today)', value: totalRevenueToday, delta: '+12.5%', isUp: true, icon: DollarSign, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Transactions', value: todaysSales.length, delta: '+3', isUp: true, icon: TrendingUp, color: 'bg-slate-50 text-slate-600' },
    { label: 'Active Customers', value: customers.length, delta: '+2', isUp: true, icon: Users, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Low Stock Items', value: lowStockCount, delta: '-1', isUp: lowStockCount > 5, icon: Package, color: 'bg-red-50 text-red-600' },
  ];

  const recentTransactions = sales.slice(0, 5).map(s => {
    const date = (s.timestamp as any as Timestamp)?.toDate();
    return {
      id: s.id,
      time: date ? format(date, 'hh:mm a') : 'Recently',
      customer: 'Walking Customer',
      total: s.total,
      items: s.items.length,
      method: s.paymentMethod
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-blue-100 group">
            <div className="flex items-start justify-between">
              <div className={cn("p-3 rounded-xl transition-colors group-hover:bg-blue-600 group-hover:text-white", stat.color)}>
                <stat.icon size={22} />
              </div>
              <div className={cn(
                "flex items-center text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                stat.isUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {stat.isUp ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />}
                {stat.delta}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {typeof stat.value === 'number' && stat.label.includes('Sales') 
                  ? formatCurrency(stat.value) 
                  : stat.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-blue-500" />
              Recent Transactions
            </h3>
            <button className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors">View History</button>
          </div>
          <div className="divide-y divide-slate-50">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-400 text-xs shadow-inner">
                    {tx.customer[0]}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{tx.customer}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                      {tx.time} • {tx.items} items • {tx.method}
                    </div>
                  </div>
                </div>
                <div className="font-black text-slate-900">{formatCurrency(tx.total)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-blue-600 rotate-12">
            <TrendingUp size={120} />
          </div>
          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Package size={18} className="text-blue-500" />
            Top Selling Items
          </h3>
          <div className="space-y-6 relative z-10">
            {[
              { name: 'Coke Original 1.5L', sold: 14, revenue: 1050, progress: 85, color: 'bg-blue-600' },
              { name: 'Piattos Cheese', sold: 42, revenue: 630, progress: 65, color: 'bg-blue-500' },
              { name: 'Bear Brand 33g', sold: 28, revenue: 448, progress: 45, color: 'bg-blue-400' },
            ].map((product, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{product.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{product.sold} units sold</p>
                  </div>
                  <p className="font-black text-slate-900 text-sm">{formatCurrency(product.revenue)}</p>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-1000 ease-out shadow-sm", product.color)}
                    style={{ width: `${product.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
