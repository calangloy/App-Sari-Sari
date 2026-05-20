import { useState } from 'react';
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, Loader2, Package, Download } from 'lucide-react';
import { Product, SystemUser } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useCollection, dbService } from '../lib/db';
import { orderBy } from 'firebase/firestore';
import { AddProductModal } from './AddProductModal';

export const InventoryView = ({ user }: { user: SystemUser | null }) => {
  const { data: products, loading } = useCollection<Product>('products', orderBy('name'));
  const { data: settings } = useCollection<any>('settings');
  const storeSettings = settings.find(s => s.id === 'store') || { lowStockThreshold: 5 };
  const lowStockThreshold = storeSettings.lowStockThreshold || 5;

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  const exportToCSV = () => {
    if (products.length === 0) {
      alert("No products to export.");
      return;
    }

    const headers = ['ID', 'Name', 'Barcode', 'Category', 'Cost Price', 'Selling Price', 'Stock Level', 'Supplier ID'];
    const rows = products.map(p => [
      p.id,
      p.name,
      p.barcode,
      p.category,
      p.costPrice,
      p.sellingPrice,
      p.stockLevel,
      p.supplierId || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!isAdmin) {
      alert("Permission denied. Only admins can delete products.");
      return;
    }
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await dbService.remove('products', id);
      // Log the action
      await dbService.add('audit_log', {
        action: 'DELETE_PRODUCT',
        details: `Deleted product: ${name} (ID: ${id})`,
        user: user?.name || 'Unknown',
        type: 'delete',
        timestamp: new Date()
      });
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

  const filteredProducts = products.filter(p => {
    const nameVal = p.name || '';
    const barcodeVal = p.barcode || '';
    return nameVal.toLowerCase().includes(searchTerm.toLowerCase()) || 
           barcodeVal.includes(searchTerm);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search products by name or barcode..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-6 py-2.5 rounded-lg hover:bg-slate-50 transition-all shadow-sm uppercase text-xs font-bold tracking-wider"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
          {isAdmin && (
            <button 
              onClick={() => {
                setEditingProduct(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100 uppercase text-xs font-bold tracking-wider"
            >
              <Plus size={18} />
              <span>Add New Product</span>
            </button>
          )}
        </div>
      </div>

      <AddProductModal 
        isOpen={isModalOpen} 
        onClose={closePortal} 
        product={editingProduct}
        user={user}
      />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Image</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Barcode</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Availability</th>
                {isAdmin && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Manage</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="text-slate-300" size={18} />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{product.name}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">{product.barcode}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-600 tracking-wider">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs">
                      <span className="text-slate-400 mr-1 uppercase font-bold tracking-tighter">Cost:</span>
                      <span className="text-slate-600 font-medium">{formatCurrency(product.costPrice)}</span>
                    </div>
                    <div className="text-sm font-black mt-0.5">
                      <span className="text-slate-400 mr-1 uppercase font-bold tracking-tighter">Selling:</span>
                      <span className="text-blue-600">{formatCurrency(product.sellingPrice)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "text-sm font-black",
                      product.stockLevel <= lowStockThreshold ? "text-red-600" : "text-slate-900"
                    )}>
                      {product.stockLevel} UNITS
                    </div>
                    {product.stockLevel <= lowStockThreshold && (
                      <span className="text-[9px] text-red-500 uppercase font-black tracking-widest block mt-0.5">CRITICAL LOW</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id, product.name)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
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
