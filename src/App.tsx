/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Users, 
  Truck, 
  Settings,
  Menu,
  X,
  CreditCard,
  History,
  LayoutDashboard,
  LogOut,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { cn, formatCurrency } from './lib/utils';
import { startOfDay } from 'date-fns';
import { useCollection, setGlobalStoreId } from './lib/db';

import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { POSView } from './components/POSView';
import { InventoryView } from './components/InventoryView';
import { AuditLogView } from './components/AuditLogView';
import { SuppliersView } from './components/SuppliersView';
import { SettingsView } from './components/SettingsView';
import { AdminManagementView } from './components/AdminManagementView';
import { SalesView } from './components/SalesView';
import { SystemUser } from './types';

type View = 'dashboard' | 'pos' | 'inventory' | 'sales' | 'activity' | 'suppliers' | 'settings' | 'admin';

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [systemUser, setSystemUser] = useState<SystemUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  const { data: sales } = useCollection<any>('sales');
  const { data: allUsers } = useCollection<SystemUser>('users');
  const allStores = allUsers.filter(u => u.role === 'owner');

  const [dailyTarget, setDailyTarget] = useState(() => Number(localStorage.getItem('dailyTarget')) || 5000);

  useEffect(() => {
    const handleStorage = () => {
      setDailyTarget(Number(localStorage.getItem('dailyTarget')) || 5000);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Auto-switch to POS for cashiers
  useEffect(() => {
    if (systemUser?.role === 'cashier') {
      setActiveView('pos');
    }
  }, [systemUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (authUser) {
        const userDocRef = doc(db, 'users', authUser.uid);
        const userDoc = await getDoc(userDocRef);
        let sUser: SystemUser | null = null;
        if (userDoc.exists()) {
          sUser = { id: userDoc.id, ...userDoc.data() } as SystemUser;
        } else {
          // If user exists in Auth but not in Firestore, create a default profile
          const isSupreme = authUser.email === 'CalangLoy@gmail.com' || authUser.providerData.some(p => p.providerId === 'google.com');
          const defaultUser = {
            name: authUser.displayName || (isSupreme ? 'Developer Admin' : 'Store Owner'),
            username: authUser.email ? authUser.email.split('@')[0] : 'owner',
            role: 'owner' as const,
            isSupreme,
          };
          try {
            await setDoc(userDocRef, {
              ...defaultUser,
              updatedAt: serverTimestamp()
            });
            sUser = { id: authUser.uid, ...defaultUser } as SystemUser;
          } catch (err) {
            console.error("Failed to auto-profile user", err);
          }
        }

        // Maintain supreme developer status
        const hasGoogleProvider = authUser.providerData.some(p => p.providerId === 'google.com') || authUser.email === 'CalangLoy@gmail.com';
        if (hasGoogleProvider && sUser) {
          sUser.isSupreme = true;
        }
        setSystemUser(sUser);
      } else {
        setSystemUser(null);
        setGlobalStoreId(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (systemUser) {
      if (systemUser.isSupreme) {
        if (allStores.length > 0 && !selectedStoreId) {
          setSelectedStoreId(allStores[0].id);
          setGlobalStoreId(allStores[0].id);
        } else if (selectedStoreId) {
          setGlobalStoreId(selectedStoreId);
        }
      } else {
        const resolvedStoreId = systemUser.storeId || (systemUser.role === 'owner' ? systemUser.id : null);
        setGlobalStoreId(resolvedStoreId);
      }
    } else {
      setGlobalStoreId(null);
    }
  }, [systemUser, allStores.length, selectedStoreId]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="text-blue-500 animate-spin" size={48} />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Point of Sale', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'activity', label: 'Activity Log', icon: History },
  ];

  if (systemUser?.role === 'owner' || systemUser?.role === 'admin') {
    navItems.push({ id: 'sales', label: 'Sales Reports', icon: BarChart3 });
    navItems.push({ id: 'suppliers', label: 'Suppliers', icon: Truck });
  }

  if (systemUser?.role === 'owner') {
    navItems.push({ id: 'admin', label: 'Team', icon: ShieldCheck });
  }

  const isCashier = systemUser?.role === 'cashier';

  const totalRevenueToday = sales
    .filter(s => {
      const date = (s.timestamp as any)?.toDate ? (s.timestamp as any).toDate() : new Date();
      return date >= startOfDay(new Date());
    })
    .reduce((sum, s) => sum + (s.total || 0), 0);

  const targetProgress = Math.min(100, (totalRevenueToday / dailyTarget) * 100);

  const canShowSidebar = !isCashier && isSidebarOpen;

  return (
    <div className={cn(
      "flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden",
      isCashier && "bg-white"
    )}>
      {/* Sidebar Navigation */}
      {!isCashier && (
        <motion.aside 
          initial={false}
          animate={{ width: isSidebarOpen ? 256 : 80 }}
          className="bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out z-20 no-print"
        >
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            {isSidebarOpen && (
              <motion.h1 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xl font-bold text-white flex items-center gap-2"
              >
                <span className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-sm">SP</span>
                Sari-Sari Pro
              </motion.h1>
            )}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 mt-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as View)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group",
                  activeView === item.id 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <item.icon size={20} className={cn("shrink-0", activeView === item.id ? "text-white" : "text-slate-500 transition-colors group-hover:text-slate-300")} />
                {isSidebarOpen && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-sm font-medium inline-block whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </button>
            ))}
          </nav>

          {isSidebarOpen && (
            <div className="p-4 bg-slate-800 m-4 rounded-xl">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">Daily Target</p>
              <div className="w-full bg-slate-700 h-1.5 rounded-full mb-2 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    targetProgress >= 100 ? "bg-green-400" : "bg-blue-400"
                  )}
                  style={{ width: `${targetProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-white font-bold tracking-tight">
                {formatCurrency(totalRevenueToday)} / {formatCurrency(dailyTarget)}
              </p>
            </div>
          )}

          <div className="p-4 border-t border-slate-700 space-y-2">
            {(systemUser?.role === 'owner' || systemUser?.role === 'admin') && (
              <button
                onClick={() => setActiveView('settings')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group",
                  activeView === 'settings' 
                    ? "bg-blue-600 text-white" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <Settings size={20} className="shrink-0" />
                {isSidebarOpen && <span className="text-sm">Settings</span>}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group text-slate-400 hover:bg-red-900/20 hover:text-red-400"
            >
              <LogOut size={20} className="shrink-0" />
              {isSidebarOpen && <span className="text-sm">Logout</span>}
            </button>
          </div>
        </motion.aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto relative flex flex-col">
        {!isCashier && (
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10 no-print">
            <h2 className="text-lg font-bold text-slate-900 capitalize">
              {navItems.find(i => i.id === activeView)?.label || activeView}
            </h2>
            <div className="flex items-center gap-6">
              {systemUser?.isSupreme && allStores.length > 0 && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Scoping Store:</span>
                  <select
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="bg-transparent border-none text-xs font-black text-blue-800 uppercase focus:ring-0 p-0 cursor-pointer outline-none"
                  >
                    {allStores.map(store => (
                      <option key={store.id} value={store.id}>{store.name} (@{store.username})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 staff-name">{systemUser?.name || 'Maria Santos'}</p>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest text-blue-500">
                  {systemUser?.isSupreme ? 'System Administrator' : (systemUser?.role || 'Store Manager')}
                </p>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center font-bold text-slate-400 uppercase">
                {systemUser?.name?.[0] || 'M'}
              </div>
            </div>
          </header>
        )}

        <div className={cn(
          "w-full",
          !isCashier ? "max-w-7xl mx-auto p-6 min-h-[calc(100vh-64px)]" : "h-screen"
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cn(isCashier && "h-full")}
            >
              {activeView === 'dashboard' && <DashboardView user={systemUser} />}
              {activeView === 'pos' && <POSView user={systemUser} onLogout={handleLogout} />}
              {activeView === 'inventory' && <InventoryView user={systemUser} />}
              {activeView === 'sales' && (systemUser?.role === 'owner' || systemUser?.role === 'admin') && <SalesView />}
              {activeView === 'activity' && <AuditLogView />}
              {activeView === 'suppliers' && (systemUser?.role === 'owner' || systemUser?.role === 'admin') && <SuppliersView user={systemUser} />}
              {activeView === 'settings' && (systemUser?.role === 'owner' || systemUser?.role === 'admin') && <SettingsView user={systemUser} />}
              {activeView === 'admin' && systemUser?.role === 'owner' && <AdminManagementView currentUser={systemUser} />}
              {/* Fallback for unauthorized access */}
              {((activeView === 'sales' || activeView === 'suppliers' || activeView === 'settings') && 
                systemUser?.role === 'cashier') || 
                (activeView === 'admin' && systemUser?.role !== 'owner') ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <ShieldCheck className="text-red-500 mb-4" size={64} />
                  <h2 className="text-2xl font-bold text-slate-900">Restricted Access</h2>
                  <p className="text-slate-500 mt-2">You do not have permission to view this section.</p>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

