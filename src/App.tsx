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
import { cn } from './lib/utils';

import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { POSView } from './components/POSView';
import { InventoryView } from './components/InventoryView';
import { CustomersView } from './components/CustomersView';
import { SuppliersView } from './components/SuppliersView';
import { SettingsView } from './components/SettingsView';
import { AdminManagementView } from './components/AdminManagementView';
import { SystemUser } from './types';

// Placeholder fragments for other views
const Sales = () => <div className="p-8">Sales Content</div>;

type View = 'dashboard' | 'pos' | 'inventory' | 'sales' | 'customers' | 'suppliers' | 'settings' | 'admin';

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [systemUser, setSystemUser] = useState<SystemUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (authUser) {
        const userDocRef = doc(db, 'users', authUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setSystemUser({ id: userDoc.id, ...userDoc.data() } as SystemUser);
        } else {
          // If user exists in Auth but not in Firestore, create a default 'owner' profile
          // This ensures the first user can actually manage the app
          const defaultUser = {
            name: authUser.displayName || 'Store Owner',
            username: authUser.email ? authUser.email.split('@')[0] : 'owner',
            role: 'owner' as const,
          };
          try {
            await setDoc(userDocRef, {
              ...defaultUser,
              updatedAt: serverTimestamp()
            });
            setSystemUser({ id: authUser.uid, ...defaultUser } as SystemUser);
          } catch (err) {
            console.error("Failed to auto-profile user", err);
            setSystemUser(null);
          }
        }
      } else {
        setSystemUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
    { id: 'customers', label: 'Customers', icon: Users },
  ];

  if (systemUser?.role === 'owner' || systemUser?.role === 'admin') {
    navItems.push({ id: 'sales', label: 'Sales Reports', icon: BarChart3 });
    navItems.push({ id: 'suppliers', label: 'Suppliers', icon: Truck });
  }

  if (systemUser?.role === 'owner') {
    navItems.push({ id: 'admin', label: 'Team', icon: ShieldCheck });
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {/* Sidebar Navigation */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 256 : 80 }}
        className="bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out z-20"
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
              <div className="bg-green-400 h-full rounded-full w-3/4"></div>
            </div>
            <p className="text-xs text-white font-medium">₱4,500 / ₱6,000</p>
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

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto relative flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-900 capitalize">
            {navItems.find(i => i.id === activeView)?.label || activeView}
          </h2>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900">{user?.displayName || 'Maria Santos'}</p>
              <p className="text-xs text-slate-500">{user?.email || 'Store Manager'}</p>
            </div>
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 bg-slate-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center font-bold text-slate-400 uppercase">
                {user?.displayName?.[0] || user?.email?.[0] || 'M'}
              </div>
            )}
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-64px)] w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'dashboard' && <DashboardView user={systemUser} />}
              {activeView === 'pos' && <POSView />}
              {activeView === 'inventory' && <InventoryView user={systemUser} />}
              {activeView === 'sales' && (systemUser?.role === 'owner' || systemUser?.role === 'admin') && <Sales />}
              {activeView === 'customers' && <CustomersView user={systemUser} />}
              {activeView === 'suppliers' && (systemUser?.role === 'owner' || systemUser?.role === 'admin') && <SuppliersView user={systemUser} />}
              {activeView === 'settings' && (systemUser?.role === 'owner' || systemUser?.role === 'admin') && <SettingsView user={systemUser} />}
              {activeView === 'admin' && systemUser?.role === 'owner' && <AdminManagementView />}
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

