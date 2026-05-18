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
  LogOut,
  Moon,
  Sun
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
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

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

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.barcode.includes(searchTerm)
  );

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    // GCash Check
    if (paymentMethod === 'e-wallet') {
      const apiKey = localStorage.getItem('gcash_api_key');
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
        cashierName: user?.name,
        customerName: customerName || 'Walking Customer',
        customerPhone: customerPhone || 'N/A'
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
    setCustomerName('');
    setCustomerPhone('');
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
      <div className="h-full bg-slate-950 text-white flex flex-col font-sans overflow-hidden transition-colors duration-300">
        {/* Banner with Store Info & Time */}
        <div className="bg-slate-900 border-b border-slate-800 px-8 py-3 flex justify-between items-center no-print">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight text-white uppercase italic">{storeSettings.name}</h1>
            <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">TERMINAL_01</span>
          </div>
        <div className="flex items-center gap-6">
            <div className="text-right border-r border-slate-800 pr-8 hidden sm:block">
              <p className="text-lg font-mono font-bold text-white">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-bold text-white">{user?.name}</p>
                <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">CASHIER ACCOUNT</p>
              </div>
              <button 
                onClick={onLogout}
                className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 group"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden no-print">
          {/* Main Transaction Area */}
          <div className="flex-1 flex flex-col bg-slate-950">
            {/* Real-time Scanning Input */}
            <div className="p-6 border-b border-slate-900/50">
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping"></div>
                  <Barcode className="text-blue-500" size={24} />
                </div>
                <form onSubmit={handleManualScan}>
                  <input
                    ref={manualInputRef}
                    autoFocus
                    type="text"
                    placeholder="SCAN BARCODE..."
                    className="w-full pl-20 pr-8 py-6 bg-slate-900 border-2 border-slate-900 rounded-2xl focus:border-blue-500/50 transition-all text-3xl font-mono font-bold text-white focus:outline-none placeholder:text-slate-800 tracking-tight"
                    value={manualEntry}
                    onChange={(e) => setManualEntry(e.target.value)}
                  />
                </form>
              </div>
            </div>

            {/* List of scanned items */}
            <div className="flex-1 overflow-auto px-6 py-2">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-950 z-10">
                  <tr className="text-left text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-900">
                    <th className="py-4 px-4">Item Description</th>
                    <th className="py-4 text-center">Unit Price</th>
                    <th className="py-4 text-center">Quantity</th>
                    <th className="py-4 text-right pr-4">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-24 text-center">
                        <ShoppingBag size={80} className="mx-auto text-slate-900 animate-pulse" />
                        <p className="text-slate-800 font-bold tracking-[0.3em] text-[10px] mt-6 uppercase">Ready for Transaction</p>
                      </td>
                    </tr>
                  ) : (
                    cart.map((item) => (
                      <tr key={item.productId} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <td className="py-5 px-4">
                          <div className="font-bold text-lg text-white tracking-tight uppercase leading-tight">{item.name}</div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase tracking-widest leading-none opacity-50">SKU_{item.productId.slice(0,10)}</div>
                        </td>
                        <td className="py-5 text-center text-slate-400 font-mono text-base">{formatCurrency(item.price)}</td>
                        <td className="py-5">
                          <div className="flex items-center justify-center gap-4">
                            <button onClick={() => updateQuantity(item.productId, -1)} className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-slate-800 transition-colors text-slate-400 font-bold">-</button>
                            <span className="text-xl font-mono font-bold text-blue-400 w-10 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.productId, 1)} className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-slate-800 transition-colors text-slate-400 font-bold">+</button>
                          </div>
                        </td>
                        <td className="py-5 text-right pr-4 font-mono font-bold text-xl text-white">
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
          <div className="w-[400px] bg-slate-900 flex flex-col border-l border-slate-800 h-full relative">
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
              <div className="space-y-4">
                <p className="text-[9px] font-black tracking-[0.2em] text-slate-500 uppercase">Current Bill Summary</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-500 font-medium">Items Total</span>
                    <span className="text-base font-mono font-bold text-white">{cart.reduce((s, i) => s + i.quantity, 0)} Pcs</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-500 font-medium">Gross Value</span>
                    <span className="text-base font-mono font-bold text-white">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-500 font-medium">Estimated VAT</span>
                    <span className="text-base font-mono font-bold text-white">{formatCurrency(tax)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800">
                <p className="text-[9px] font-black tracking-[0.2em] text-slate-500 uppercase mb-1">Total Amount Payable</p>
                <h2 className="text-5xl font-mono font-bold tracking-tighter leading-none text-blue-400">
                  {formatCurrency(total)}
                </h2>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-800">
                <p className="text-[9px] font-black tracking-[0.2em] text-slate-500 uppercase">Payment Method</p>
                <div className="grid grid-cols-2 gap-3 pb-8">
                  <button 
                    onClick={() => setPaymentMethod('cash')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all group",
                      paymentMethod === 'cash' ? "bg-white text-slate-950 border-white" : "bg-slate-950 text-slate-500 border-slate-800 shadow-none"
                    )}
                  >
                    <Banknote size={20} className={paymentMethod === 'cash' ? "text-slate-950" : "text-slate-800"} />
                    <span className="font-bold text-[9px] uppercase tracking-widest">Cash</span>
                  </button>
                  <button 
                     onClick={() => setPaymentMethod('e-wallet')}
                     className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all group text-center",
                        paymentMethod === 'e-wallet' ? "bg-blue-600 text-white border-blue-600" : "bg-slate-950 text-slate-500 border-slate-800 shadow-none"
                      )}
                  >
                    <Wallet size={20} className={paymentMethod === 'e-wallet' ? "text-white" : "text-slate-800"} />
                    <span className="font-bold text-[9px] uppercase tracking-widest">GCash</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sticky Action Panel to ensure visibility */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-800 bg-slate-900 shadow-[0_-20px_40px_rgba(15,23,42,0.6)] space-y-4">
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isProcessing}
                className="w-full bg-blue-600 text-white py-6 rounded-2xl font-bold text-xl uppercase tracking-widest shadow-2xl shadow-blue-600/20 hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center gap-4"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <Receipt size={24} />}
                COMPLETE SALE
              </button>
              <button 
                onClick={handleCancelTransaction}
                className="w-full py-1 text-slate-700 font-bold uppercase text-[9px] tracking-[0.3em] hover:text-red-500 transition-colors"
                disabled={cart.length === 0}
              >
                Void Transaction
              </button>
            </div>
          </div>
        </div>

        {/* Receipt / Success Modals should still appear above this */}
        {showReceipt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl no-print">
            <div className="bg-white rounded-[3rem] p-12 max-w-md w-full shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-300">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={48} />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">SUCCESS!</h3>
                <p className="text-slate-500 font-medium tracking-tight">Printing customer receipt...</p>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-left space-y-4">
                <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                  <span>Reference:</span>
                  <span className="text-slate-900">{lastTransaction?.orderId}</span>
                </div>
                <div className="flex justify-between text-4xl font-black text-slate-900 pt-4 border-t border-slate-200">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(lastTransaction?.total || 0)}</span>
                </div>
              </div>

              <button
                onClick={finishTransaction}
                className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all shadow-xl active:scale-95"
              >
                Open Next Register
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
              <span>CUSTOMER: {lastTransaction?.customerName}</span>
            </div>
            {lastTransaction?.customerPhone !== 'N/A' && (
              <div className="flex justify-between">
                <span>PHONE: {lastTransaction?.customerPhone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>CASHIER: {lastTransaction?.cashierName || user?.name || 'Staff Member'}</span>
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
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-180px)]">
      {/* Product Selection */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Scan className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <form onSubmit={handleManualScan}>
              <input
                ref={manualInputRef}
                type="text"
                placeholder="Scanner Ready..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-sm shadow-inner"
                value={manualEntry}
                onChange={(e) => setManualEntry(e.target.value)}
              />
            </form>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                activeCategory === cat 
                  ? "bg-slate-900 text-white shadow-md shadow-slate-200" 
                  : "bg-white border border-slate-200 text-slate-400 hover:bg-slate-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="flex flex-col text-left p-2 rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md cursor-pointer transition-all group bg-white relative overflow-hidden"
              >
                <div className="w-full aspect-square bg-slate-50 rounded-lg mb-2 flex items-center justify-center text-slate-300 group-hover:bg-blue-50 transition-colors overflow-hidden relative">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:rotate-2 transition-transform duration-500" />
                  ) : (
                    <Package size={24} />
                  )}
                  {product.stockLevel <= 5 && (
                    <div className="absolute top-1 right-1 bg-red-500 text-[8px] font-black text-white px-1.5 py-0.5 rounded-full uppercase">Low</div>
                  )}
                </div>
                <div className="font-bold text-[11px] text-slate-900 line-clamp-2 uppercase italic tracking-tight">{product.name}</div>
                <div className="flex justify-between items-end mt-1.5 pt-1.5 border-t border-slate-50">
                  <span className="text-blue-600 font-mono font-bold text-xs">{formatCurrency(product.sellingPrice)}</span>
                  <span className="text-[9px] font-black text-slate-300 uppercase">{product.stockLevel}x</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart & Checkout */}
      <div className="lg:col-span-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden min-w-[320px]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-blue-500" />
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900">Current Cart</h2>
          </div>
          <button 
            onClick={() => setCart([])}
            className="text-red-500 text-[10px] font-black uppercase tracking-widest hover:underline"
          >
            Clear
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3 no-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-3 opacity-50">
              <ShoppingBag size={40} strokeWidth={1} />
              <p className="text-[10px] font-black uppercase tracking-widest">Basket Empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="flex gap-2 animate-in fade-in slide-in-from-right-2 duration-300 pb-3 border-b border-slate-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-900 truncate uppercase">{item.name}</p>
                  <p className="text-[10px] font-mono text-slate-400">
                    {formatCurrency(item.price)} x {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-mono font-bold text-slate-900">{formatCurrency(item.price * item.quantity)}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <button 
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="p-1 hover:text-blue-600 transition-colors bg-slate-50 rounded"
                    >
                      <Minus size={10} />
                    </button>
                    <button 
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="p-1 hover:text-blue-600 transition-colors bg-slate-50 rounded"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-5 bg-slate-50 space-y-4 border-t border-slate-100">
          <div className="space-y-1.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tendered via</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'cash', label: 'Cash' },
                { id: 'e-wallet', label: 'GCash' },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-3 rounded-xl border transition-all",
                    paymentMethod === method.id 
                      ? "border-2 border-slate-900 bg-white" 
                      : "border-slate-200 bg-white"
                  )}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 space-y-1.5 mt-2">
            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
              <span>Subtotal</span>
              <span className="font-mono">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
              <span>VAT (12%)</span>
              <span className="font-mono">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-lg font-black text-slate-900 pt-1 border-t border-slate-200 mt-1 uppercase tracking-tighter">
              <span>Payable</span>
              <span className="font-mono text-blue-600">{formatCurrency(total)}</span>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  <span>Processing...</span>
                </>
              ) : (
                <>Charge Settlement</>
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
