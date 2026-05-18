import { useState } from 'react';
import { 
  Plus, 
  Minus, 
  Trash2, 
  Scan, 
  Search, 
  CreditCard, 
  Banknote, 
  Wallet,
  Receipt,
  Printer,
  Package,
  History,
  ShoppingCart,
  Loader2
} from 'lucide-react';
import { Product, SaleItem } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Scanner } from './Scanner';
import { useCollection, dbService } from '../lib/db';
import { orderBy, serverTimestamp } from 'firebase/firestore';

export const POSView = () => {
  const { data: products, loading } = useCollection<Product>('products', orderBy('name'));
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'e-wallet'>('cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        productId: product.id!,
        name: product.name,
        quantity: 1,
        price: product.sellingPrice
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleScan = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
    } else {
      alert("Product not found!");
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.barcode.includes(searchTerm)
  );

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      await dbService.add('sales', {
        items: cart,
        total,
        paymentMethod,
        timestamp: serverTimestamp()
      });
      
      // Update stock levels
      for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await dbService.update('products', product.id!, {
            stockLevel: product.stockLevel - item.quantity
          });
        }
      }

      setCart([]);
      alert("Transaction successful!");
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const categories = ['All', 'Drinks', 'Snacks', 'Canned Goods', 'Biscuits', 'Milk'];
  const [activeCategory, setActiveCategory] = useState('All');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-180px)]">
      {/* Product Selection */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Scan product or type name..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
          >
            <Scan size={20} />
            <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Scan Barcode</span>
          </button>
        </div>

        <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                activeCategory === cat 
                  ? "bg-blue-50 text-blue-600 border border-blue-200" 
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="flex flex-col text-left p-3 rounded-xl border border-slate-100 hover:border-blue-300 shadow-sm cursor-pointer transition-all group bg-white"
              >
                <div className="w-full aspect-square bg-slate-50 rounded-lg mb-3 flex items-center justify-center text-slate-300 group-hover:bg-blue-50 transition-colors">
                  <Package size={28} />
                </div>
                <div className="font-bold text-sm text-slate-900 line-clamp-1">{product.name}</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-blue-600 font-bold">{formatCurrency(product.sellingPrice)}</span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold",
                    product.stockLevel <= 5 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  )}>
                    {product.stockLevel} In Stock
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart & Checkout */}
      <div className="lg:col-span-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">Current Cart</h2>
          <button 
            onClick={() => setCart([])}
            className="text-red-500 text-xs font-bold uppercase hover:underline"
          >
            Clear
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
              <History size={48} strokeWidth={1.5} />
              <p className="text-xs font-bold uppercase tracking-widest">Cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="flex gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatCurrency(item.price)} x {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(item.price * item.quantity)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <button 
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="p-0.5 hover:text-blue-600 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <button 
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="p-0.5 hover:text-blue-600 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-50 space-y-4 border-t border-slate-100">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'cash', label: 'Cash', sub: 'Payment' },
                { id: 'e-wallet', label: 'GCash', sub: 'E-Wallet' },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border transition-all",
                    paymentMethod === method.id 
                      ? "border-2 border-blue-500 bg-white" 
                      : "border-slate-200 bg-white hover:bg-white"
                  )}
                >
                  <span className="text-sm font-bold">{method.label}</span>
                  <span className="text-[10px] text-slate-400">{method.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-xl font-black text-slate-900 pt-1 border-t border-slate-200 mt-2">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing...</span>
                </>
              ) : (
                <>Charge & Print Receipt</>
              )}
            </button>
          </div>
        </div>
      </div>

      <Scanner 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScan={handleScan} 
      />
    </div>
  );
};
