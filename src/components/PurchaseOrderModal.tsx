import React, { useState } from 'react';
import { X, Loader2, ShoppingCart, Plus, Minus, Trash2, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService, useCollection } from '../lib/db';
import { serverTimestamp } from 'firebase/firestore';
import { Supplier, Product } from '../types';
import { formatCurrency } from '../lib/utils';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier;
}

export const PurchaseOrderModal = ({ isOpen, onClose, supplier }: PurchaseOrderModalProps) => {
  const { data: allProducts } = useCollection<Product>('products');
  const [isLoading, setIsLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<{ productId: string; name: string; quantity: number; cost: number }[]>([]);

  const supplierProducts = allProducts.filter(p => p.supplierId === supplier.id);

  const addItem = (product: Product) => {
    setOrderItems(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId: product.id!, name: product.name, quantity: 1, cost: product.costPrice }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setOrderItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (productId: string) => {
    setOrderItems(prev => prev.filter(item => item.productId !== productId));
  };

  const total = orderItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      alert("Please add at least one item.");
      return;
    }
    setIsLoading(true);
    try {
      await dbService.add('purchases', {
        supplierId: supplier.id,
        items: orderItems,
        total,
        status: 'received', // Auto-receive for now to update stock immediately
        timestamp: serverTimestamp()
      });

      // Update stock levels
      for (const item of orderItems) {
        const product = allProducts.find(p => p.id === item.productId);
        if (product) {
          await dbService.update('products', product.id!, {
            stockLevel: product.stockLevel + item.quantity
          });
        }
      }

      alert("Restock successful! Inventory updated.");
      onClose();
      setOrderItems([]);
    } catch (error) {
      console.error(error);
      alert("Failed to create purchase order.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="bg-slate-900 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Order from {supplier.name}</h2>
                  <p className="text-xs text-slate-400 font-medium">Create a restock purchase order</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Product Selection */}
              <div className="flex-1 p-6 border-r border-slate-100 overflow-y-auto">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Supplier Catalog</h3>
                <div className="grid grid-cols-1 gap-2">
                  {supplierProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addItem(product)}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                           <Package size={18} className="text-slate-400" />
                         </div>
                         <div>
                           <p className="font-bold text-slate-900 text-sm">{product.name}</p>
                           <p className="text-xs text-slate-500">Current Stock: {product.stockLevel}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-blue-600 text-sm">{formatCurrency(product.costPrice)}</span>
                        <Plus size={18} className="text-blue-500" />
                      </div>
                    </button>
                  ))}
                  {supplierProducts.length === 0 && (
                    <div className="text-center py-12 text-slate-400 italic text-sm">
                      No products assigned to this supplier.
                    </div>
                  )}
                </div>
              </div>

              {/* Order List */}
              <div className="w-full md:w-96 bg-slate-50 flex flex-col">
                <div className="p-6 flex-1 overflow-y-auto">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Current Order</h3>
                  <div className="space-y-3">
                    {orderItems.map(item => (
                      <div key={item.productId} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-sm text-slate-900 line-clamp-1">{item.name}</p>
                          <button onClick={() => removeItem(item.productId)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                             <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:bg-slate-100 rounded-lg"><Minus size={14} /></button>
                             <span className="font-bold text-slate-700 min-w-[2ch] text-center">{item.quantity}</span>
                             <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:bg-slate-100 rounded-lg"><Plus size={14} /></button>
                          </div>
                          <p className="font-bold text-blue-600 text-sm">{formatCurrency(item.cost * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                    {orderItems.length === 0 && (
                      <div className="text-center py-12 text-slate-400 italic text-sm">
                        Order list is empty
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-white border-t border-slate-200">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Grand Total</span>
                    <span className="text-2xl font-black text-blue-600">{formatCurrency(total)}</span>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading || orderItems.length === 0}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
                  >
                    {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "Complete Restock"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
