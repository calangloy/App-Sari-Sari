import { useState } from 'react';
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, Loader2, Package, Download } from 'lucide-react';
import { Product, SystemUser } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useCollection, dbService } from '../lib/db';
import { orderBy } from 'firebase/firestore';
import { AddProductModal } from './AddProductModal';
import { format } from 'date-fns';

export const InventoryView = ({ user }: { user: SystemUser | null }) => {
  const { data: products, loading } = useCollection<Product>('products', orderBy('name'));
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  const handleDelete = async (id: string, name: string) => {
    if (!isAdmin) {
      alert("Permission denied. Only admins can delete products.");
      return;
    }
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await dbService.remove('products', id);
    } catch (error) {
      console.error(error);
      alert("Failed to delete product.");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const closePortal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.barcode.includes(searchTerm)
  );

  const exportToCSV = () => {
    if (filteredProducts.length === 0) return;
    
    const headers = ["ID", "Name", "Barcode", "Category", "Cost Price", "Selling Price", "Stock Level"];
    const rows = filteredProducts.map(p => [
      p.id,
      `"${p.name}"`,
      p.barcode,
      p.category,
      p.costPrice,
      p.sellingPrice,
      p.stockLevel
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-display">Inventory Control</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Manage your products and monitor stock levels</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 px-6 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm text-[10px] font-black uppercase tracking-[0.2em]"
          >
            <Download size={18} />
            <span>Export Data</span>
          </button>
          {isAdmin && (
            <button 
              onClick={() => {
                setEditingProduct(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-600 dark:bg-blue-500 text-white px-8 py-3 rounded-2xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 dark:shadow-none uppercase text-[10px] font-black tracking-widest active:scale-95"
            >
              <Plus size={20} />
              <span>New Commodity</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative group max-w-2xl">
        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 block">Quick Search</label>
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, barcode, or SKU..."
            className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner transition-all text-slate-900 dark:text-white font-bold placeholder:font-normal"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <AddProductModal 
        isOpen={isModalOpen} 
        onClose={closePortal} 
        product={editingProduct}
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none font-display">Unit Image</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none font-display">Commodity Identity</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none font-display">Serial/Barcode</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none font-display">Classification</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none font-display text-center">Retail Rate</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none font-display text-center">Inventory Level</th>
                {isAdmin && <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none font-display text-right">Operations</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-6">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="text-slate-300 dark:text-slate-600" size={24} />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="font-bold text-slate-900 dark:text-white text-lg tracking-tight uppercase italic">{product.name}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ref_{product.id.slice(0,6)}</div>
                  </td>
                  <td className="px-6 py-6 text-xs font-mono text-slate-500 dark:text-slate-400">{product.barcode}</td>
                  <td className="px-6 py-6">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 tracking-wider border border-slate-200 dark:border-slate-700">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sell Price</div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">{formatCurrency(product.sellingPrice)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <div className={cn(
                      "text-xl font-mono font-bold",
                      product.stockLevel <= 5 ? "text-red-500" : "text-slate-900 dark:text-white"
                    )}>
                      {product.stockLevel}
                    </div>
                    {product.stockLevel <= 5 && (
                      <span className="text-[9px] text-red-500 uppercase font-black tracking-widest block mt-1 animate-pulse">Low Stock</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id, product.name)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
