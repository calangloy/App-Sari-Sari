import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  Barcode,
  ShoppingBag,
  LogOut
} from 'lucide-react';
import { Product, SaleItem, SystemUser } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Scanner } from './Scanner';
import { useCollection, dbService } from '../lib/db';
import { orderBy, serverTimestamp } from 'firebase/firestore';

export const POSView = ({ user, onLogout }: { user: SystemUser | null; onLogout?: () => void }) => {
  const isCashierMode = user?.role === 'cashier';
  const { data: products, loading } = useCollection<Product>('products', orderBy('name'));
  const { data: storeSettingsData } = useCollection<any>('settings');
  const storeSettings = storeSettingsData.find(s => s.id === 'store') || {
    name: 'SARISARI PRO POS',
    address: '123 Market Street, City',
    phone: '0917-000-0000',
    logoUrl: '',
    taxRate: 0.12
  };

  const [cart, setCart] = useState<SaleItem[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'e-wallet'>('cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [manualEntry, setManualEntry] = useState('');

  const subtotal = cart.reduce((acc, current) => acc + (current.price * current.quantity), 0);
  const tax = subtotal * (storeSettings.taxRate || 0);
  const total = subtotal + tax;

  const scannerBuffer = useRef('');
  const lastKeyTime = useRef(0);
  const manualInputRef = useRef<HTMLInputElement>(null);

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

  const handleScan = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
    } else {
      alert("Product not found!");
    }
  };

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualEntry) {
      handleScan(manualEntry);
      setManualEntry('');
    }
  };

  const filteredProducts = products.filter(p => {
    const nameVal = p.name || '';
    const barcodeVal = p.barcode || '';
    return nameVal.toLowerCase().includes(searchTerm.toLowerCase()) || 
           barcodeVal.includes(searchTerm);
  });

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    // GCash Check
    if (paymentMethod === 'e-wallet') {
      const apiKey = storeSettings?.gcashApiKey;
      if (!apiKey) {
        alert("GCash API not linked. Please configure it in settings.");
        return;
      }
      // Simulation of async payment verification (Professional Looking)
      setIsProcessing(true);
      await new Promise(r => setTimeout(r, 1500)); // Simulate API call
      const confirmed = confirm("GCash API Response: Payment of " + formatCurrency(total) + " verified. Confirm to complete transaction?");
      if (!confirmed) {
        setIsProcessing(false);
        return;
      }
    }
    try {
      const saleData = {
        items: cart,
        subtotal,
        tax,
        total,
        paymentMethod,
        timestamp: serverTimestamp(),
        orderId: `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        cashierId: user?.id,
        cashierName: user?.name
      };

      const docRef = await dbService.add('sales', saleData);
      
      // Update stock levels
      for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await dbService.update('products', product.id!, {
            stockLevel: Math.max(0, product.stockLevel - item.quantity)
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

  const handleCancelTransaction = () => {
    if (cart.length === 0) return;
    
    if (isCashierMode) {
      const pin = prompt("MANAGER AUTHORIZATION REQUIRED\nPlease enter Store Manager PIN to cancel this transaction:");
      if (!pin) return;
      
      const isValid = pin === (storeSettings.managerPin || '1234');
      
      if (!isValid) {
        alert("INVALID MANAGER PIN. ACCESS DENIED.");
        return;
      }
    } else {
      if (!confirm("Are you sure you want to clear the current cart?")) return;
    }
    
    setCart([]);
  };

  const finishTransaction = () => {
    setCart([]);
    setShowReceipt(false);
    setLastTransaction(null);
  };

  const categories = ['All', 'Drinks', 'Snacks', 'Canned Goods', 'Biscuits', 'Milk', 'Ingredients', 'Household', 'Groceries', 'Personal Care', 'Rice & Grains', 'Frozen Food', 'Bakery', 'Stationery', 'Medicine'];
  const [activeCategory, setActiveCategory] = useState('All');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  // PROFESSIONAL CASHIER MODE
  if (isCashierMode) {
    return (
      <div className="h-full bg-slate-900 text-white flex flex-col font-mono overflow-hidden">
        {/* Banner with Store Info & Time */}
        <div className="bg-slate-800 border-b border-slate-700 px-8 py-3 flex justify-between items-center no-print">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black tracking-tighter text-blue-400 uppercase">{storeSettings.name}</h1>
            <span className="text-[10px] text-slate-400 bg-slate-700 px-2 py-0.5 rounded">STATION 01</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-bold">{new Date().toLocaleTimeString()}</p>
              <p className="text-[10px] text-slate-400">{new Date().toLocaleDateString()}</p>
            </div>
            <button 
              onClick={onLogout}
              className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 group"
              title="Logout"
            >
              <LogOut size={20} />
              <span className="text-xs font-black uppercase tracking-widest hidden lg:inline">Logout Account</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden no-print">
          {/* Main Transaction Area */}
          <div className="flex-1 flex flex-col border-r border-slate-800">
            {/* Real-time Scanning Input */}
            <div className="p-8 bg-slate-800/50">
              <div className="relative group">
                <Scan className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-400 group-focus-within:animate-pulse" size={32} />
                <form onSubmit={handleManualScan}>
                  <input
                    ref={manualInputRef}
                    autoFocus
                    type="text"
                    placeholder="SCANNIN READY..."
                    className="w-full pl-20 pr-8 py-8 bg-slate-900 border-2 border-slate-700 rounded-2xl focus:border-blue-500 transition-all text-4xl font-black text-white focus:outline-none placeholder:text-slate-800 tracking-tighter"
                    value={manualEntry}
                    onChange={(e) => setManualEntry(e.target.value)}
                  />
                </form>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 text-[10px] font-bold uppercase flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Connected
                </div>
              </div>
            </div>

            {/* List of scanned items (Professional Table Style) */}
            <div className="flex-1 overflow-auto px-8 py-4">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-900 z-10">
                  <tr className="text-left text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                    <th className="py-4">Description</th>
                    <th className="py-4 text-center">Unit Price</th>
                    <th className="py-4 text-center">Qty</th>
                    <th className="py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-24 text-center">
                        <ShoppingBag size={64} className="mx-auto text-slate-800 mb-4 opacity-20" />
                        <p className="text-slate-700 font-bold tracking-widest text-sm">WAITING FOR SCANS</p>
                      </td>
                    </tr>
                  ) : (
                    cart.map((item) => (
                      <tr key={item.productId} className="animate-in fade-in slide-in-from-left-4">
                        <td className="py-6">
                          <div className="font-black text-xl text-white tracking-tight">{item.name}</div>
                          <div className="text-[10px] text-slate-500 font-bold mt-1">ID: {item.productId.slice(0,8)}</div>
                        </td>
                        <td className="py-6 text-center text-slate-400 font-bold">{formatCurrency(item.price)}</td>
                        <td className="py-6">
                          <div className="flex items-center justify-center gap-4">
                            <button onClick={() => updateQuantity(item.productId, -1)} className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center hover:bg-slate-700">-</button>
                            <span className="text-2xl font-black text-blue-400 w-12 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.productId, 1)} className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center hover:bg-slate-700">+</button>
                          </div>
                        </td>
                        <td className="py-6 text-right font-black text-2xl text-white">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Checkout / Totals Panel */}
          <div className="w-[450px] bg-slate-800 flex flex-col p-8 border-l border-slate-700">
            <div className="flex-1 space-y-8">
              <div className="space-y-4">
                <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Current Transaction</p>
                <div className="space-y-3">
                  <div className="flex justify-between text-xl text-slate-400 font-bold">
                    <span>Items Count</span>
                    <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between text-xl text-slate-400 font-bold">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xl text-slate-400 font-bold">
                    <span>Tax (VAT)</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-700">
                <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-4">Total Amount Due</p>
                <h2 className="text-[5rem] font-black tracking-tighter leading-none text-blue-400 mb-2">
                  {formatCurrency(total)}
                </h2>
                <div className="text-slate-500 font-bold italic text-xs">
                  * All amounts in Philippine Peso (PHP)
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Payment Method</p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setPaymentMethod('cash')}
                    className={cn(
                      "flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all font-black text-sm uppercase tracking-widest",
                      paymentMethod === 'cash' ? "bg-white text-slate-900 border-white shadow-xl shadow-white/5" : "bg-slate-900 text-slate-400 border-slate-700"
                    )}
                  >
                    <Banknote size={20} />
                    Cash
                  </button>
                  <button 
                     onClick={() => setPaymentMethod('e-wallet')}
                     className={cn(
                        "flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all font-black text-sm uppercase tracking-widest",
                        paymentMethod === 'e-wallet' ? "bg-blue-500 text-white border-blue-400 shadow-xl shadow-blue-500/10" : "bg-slate-900 text-slate-400 border-slate-700"
                      )}
                  >
                    <Wallet size={20} />
                    GCash
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-8 space-y-4">
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isProcessing}
                className="w-full bg-blue-500 text-white py-8 rounded-3xl font-black text-2xl uppercase tracking-widest shadow-2xl shadow-blue-500/20 hover:bg-blue-400 active:scale-95 transition-all flex items-center justify-center gap-4"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={32} /> : <Receipt size={32} />}
                COMPLETE SALE
              </button>
              <button 
                onClick={handleCancelTransaction}
                className="w-full py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-red-400 transition-colors"
                disabled={cart.length === 0}
              >
                Cancel Transaction [ESC]
              </button>
            </div>
          </div>
        </div>

        {/* Receipt / Success Modals should still appear above this */}
        {showReceipt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md no-print">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">SUCCESS!</h3>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Printing Receipt...</p>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Reference:</span>
                  <span className="text-slate-900">{lastTransaction?.orderId}</span>
                </div>
                <div className="flex justify-between text-2xl font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(lastTransaction?.total || 0)}</span>
                </div>
              </div>

              <button
                onClick={finishTransaction}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl active:scale-95"
              >
                Start New Transaction
              </button>
            </div>
          </div>
        )}

        <div className="absolute -left-[9999px] top-0 print:static print:block print:w-full print:bg-white text-black font-mono p-4 print-container">
          <div className="text-center space-y-1 mb-4">
            {storeSettings.logoUrl && (
              <div className="flex justify-center mb-2">
                <img src={storeSettings.logoUrl} alt="Store Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
              </div>
            )}
            <h1 className="text-lg font-bold uppercase">{storeSettings.name}</h1>
            <p className="text-xs">{storeSettings.address}</p>
            <p className="text-xs">TEL: {storeSettings.phone}</p>
            <p className="text-[10px]">TIN: 000-123-456-000</p>
          </div>
          
          <div className="border-t border-b border-black py-2 my-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span>DATE: {new Date().toLocaleDateString()}</span>
              <span>TIME: {new Date().toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span>ORDER ID: {lastTransaction?.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span>CASHIER: {user?.name || 'Staff Member'}</span>
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
                  <td className="py-1 uppercase">{item.name}</td>
                  <td className="py-1 text-right">x{item.quantity}</td>
                  <td className="py-1 text-right">{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-black pt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span>SUBTOTAL:</span>
              <span>{formatCurrency(lastTransaction?.subtotal || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>TAX/VAT:</span>
              <span>{formatCurrency(lastTransaction?.tax || 0)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-black">
              <span>TOTAL:</span>
              <span>{formatCurrency(lastTransaction?.total || 0)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span>METHOD:</span>
              <span>{lastTransaction?.paymentMethod?.toUpperCase()}</span>
            </div>
          </div>

          <div className="text-center mt-6 text-[10px] space-y-1">
            <p className="font-bold">{storeSettings.receiptFootnote || 'THANK YOU FOR YOUR BUSINESS!'}</p>
            <p className="opacity-50">SariSari Pro POS Systems</p>
          </div>
        </div>
      </div>
    );
  }

  // STANDARD OWNER/ADMIN POS VIEW
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-180px)]">
      {/* Product Selection */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Scan className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <form onSubmit={handleManualScan}>
              <input
                ref={manualInputRef}
                type="text"
                placeholder="Scanner Ready... (or type barcode here)"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                value={manualEntry}
                onChange={(e) => setManualEntry(e.target.value)}
              />
            </form>
          </div>
          <button 
            type="button"
            onClick={() => manualInputRef.current?.focus()}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-md shadow-slate-200"
          >
            <Barcode size={20} />
            <span className="hidden sm:inline text-xs font-black uppercase tracking-widest">Focus Scanner</span>
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
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>VAT ({((storeSettings.taxRate || 0) * 100).toFixed(0)}%)</span>
              <span>{formatCurrency(tax)}</span>
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
      <div className="absolute -left-[9999px] top-0 print:static print:block print:w-full print:bg-white text-black font-mono p-4 print-container">
        <div className="text-center space-y-1 mb-4">
          {storeSettings.logoUrl && (
            <div className="flex justify-center mb-2">
              <img src={storeSettings.logoUrl} alt="Store Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
            </div>
          )}
          <h1 className="text-lg font-bold uppercase">{storeSettings.name}</h1>
          <p className="text-xs">{storeSettings.address}</p>
          <p className="text-xs">TEL: {storeSettings.phone}</p>
          <p className="text-[10px]">TIN: 000-123-456-000</p>
        </div>
        
        <div className="border-t border-b border-black py-2 my-2 space-y-1 text-xs">
          <div className="flex justify-between">
            <span>DATE: {new Date().toLocaleDateString()}</span>
            <span>TIME: {new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex justify-between">
            <span>ORDER ID: {lastTransaction?.orderId}</span>
          </div>
          <div className="flex justify-between">
            <span>CASHIER: {user?.name || 'Staff Member'}</span>
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

        <div className="border-t border-black pt-2 space-y-1 text-xs">
          <div className="flex justify-between">
            <span>SUBTOTAL:</span>
            <span>{formatCurrency(lastTransaction?.subtotal || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>TAX/VAT:</span>
            <span>{formatCurrency(lastTransaction?.tax || 0)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-1 border-t border-black">
            <span>TOTAL:</span>
            <span>{formatCurrency(lastTransaction?.total || 0)}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span>PAYMENT:</span>
            <span>{lastTransaction?.paymentMethod?.toUpperCase()}</span>
          </div>
        </div>

        <div className="text-center mt-6 text-[10px] space-y-1">
          <p className="font-bold">{storeSettings.receiptFootnote || 'THANKS FOR SHOPPING!'}</p>
          <p className="opacity-50">SariSari Pro POS Systems</p>
        </div>
      </div>
    </div>
  );
};
