import { useState, useEffect, useRef } from 'react';
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
  Loader2,
  CheckCircle2
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
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const scannerBuffer = useRef('');
  const lastKeyTime = useRef(0);

  // Global Barcode Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input field (unless it's the search field)
      if (
        document.activeElement?.tagName === 'INPUT' && 
        !(document.activeElement as HTMLInputElement).placeholder.includes("Scan")
      ) return;

      const currentTime = Date.now();
      
      // Hardware scanners usually send characters very fast (< 50ms)
      if (currentTime - lastKeyTime.current > 100) {
        scannerBuffer.current = '';
      }

      if (e.key === 'Enter') {
        if (scannerBuffer.current.length > 2) {
          handleScan(scannerBuffer.current);
          scannerBuffer.current = '';
        }
      } else if (e.key.length === 1) {
        scannerBuffer.current += e.key;
      }

      lastKeyTime.current = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products]);

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
      const saleData = {
        items: cart,
        total,
        paymentMethod,
        timestamp: serverTimestamp(),
        orderId: `POS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      };

      const docRef = await dbService.add('sales', saleData);
      
      // Update stock levels
      for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await dbService.update('products', product.id!, {
            stockLevel: product.stockLevel - item.quantity
          });
        }
      }

      setLastTransaction({ ...saleData, id: docRef?.id });
      setShowReceipt(true);
      
      // Trigger browser print dialog for thermal receipt printers
      setTimeout(() => {
        window.print();
      }, 500);

    } catch (error) {
      console.error(error);
      alert("Checkout failed. Check network connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  const finishTransaction = () => {
    setCart([]);
    setShowReceipt(false);
    setLastTransaction(null);
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
                <div className="w-full aspect-square bg-slate-50 rounded-lg mb-3 flex items-center justify-center text-slate-300 group-hover:bg-blue-50 transition-colors overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <Package size={28} />
                  )}
                </div>
                <div className="font-bold text-sm text-slate-900 line-clamp-1">{product.name}</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-blue-600 font-bold">{formatCurrency(product.sellingPrice)}</span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold",
                    product.stockLevel <= 5 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  )}>
                    {product.stockLevel}x
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

      {/* Printing / Success Overlay */}
      {showReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md no-print">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 text-center uppercase tracking-tight">Payment Complete</h3>
              <p className="text-slate-500 text-sm font-medium">Receipt is being printed automatically.</p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                <span>Ref No:</span>
                <span className="text-slate-900">{lastTransaction?.orderId}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                <span>Method:</span>
                <span className="text-slate-900">{lastTransaction?.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total:</span>
                <span>{formatCurrency(lastTransaction?.total || 0)}</span>
              </div>
            </div>

            <button
              onClick={finishTransaction}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              Finish & Start New Sale
            </button>
          </div>
        </div>
      )}

      {/* Hidden Thermal Receipt Print Layout */}
      <div className="hidden print:block print:w-full print:bg-white text-black font-mono p-4 print-container">
        <div className="text-center space-y-1 mb-4">
          <h1 className="text-lg font-bold">SARISARI PRO POS</h1>
          <p className="text-xs">123 Market Street, City</p>
          <p className="text-[10px]">TIN: 000-123-456-000</p>
        </div>
        
        <div className="border-t border-b border-black py-2 my-2 space-y-1 text-xs">
          <div className="flex justify-between">
            <span>DATE: {new Date().toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>ORDER ID: {lastTransaction?.orderId}</span>
          </div>
          <div className="flex justify-between">
            <span>CASHIER: {document.querySelector('.staff-name')?.textContent || 'Staff'}</span>
          </div>
        </div>

        <table className="w-full text-xs text-left mb-4">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1">ITEM</th>
              <th className="py-1 text-right">QTY</th>
              <th className="py-1 text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {(lastTransaction?.items || []).map((item: any, i: number) => (
              <tr key={i}>
                <td className="py-1">{item.name}</td>
                <td className="py-1 text-right">x{item.quantity}</td>
                <td className="py-1 text-right">{formatCurrency(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-black pt-2 space-y-1 text-xs font-bold">
          <div className="flex justify-between text-sm">
            <span>TOTAL:</span>
            <span>{formatCurrency(lastTransaction?.total || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>PAYMENT:</span>
            <span>{lastTransaction?.paymentMethod?.toUpperCase()}</span>
          </div>
        </div>

        <div className="text-center mt-6 text-[10px]">
          <p>THANKS FOR SHOPPING!</p>
          <p>This is not an official receipt.</p>
        </div>
      </div>
    </div>
  );
};
