import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { motion } from 'motion/react';
import { LogIn, Store, AlertCircle, Loader2, Compass, ArrowLeft, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

export const LoginView = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Multi-tenant Store state
  const [step, setStep] = useState<'store' | 'auth'>('store');
  const [storeCode, setStoreCode] = useState('');
  const [resolvedStore, setResolvedStore] = useState<{ uid: string; name: string; username: string } | null>(null);
  
  // Auth Form State
  const [isStaff, setIsStaff] = useState(false);
  const [staffUsername, setStaffUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed admin validation.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedCode = storeCode.toLowerCase().trim().replace(/\s/g, '');
    if (!sanitizedCode) return;

    setIsLoading(true);
    setError(null);
    try {
      // Direct Owner / Admin fallback for first setup
      if (sanitizedCode === 'owner') {
        setResolvedStore({ uid: 'owner', name: 'Standard Register', username: 'owner' });
        setStep('auth');
        setIsLoading(false);
        return;
      }

      // Query store owners in the database
      const q = query(
        collection(db, 'users'), 
        where('username', '==', sanitizedCode),
        where('role', '==', 'owner')
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setError(`Sari-Sari Store "${storeCode}" was not found. Please contact Loy Calang to register this store.`);
      } else {
        const doc = snap.docs[0];
        const data = doc.data();
        setResolvedStore({
          uid: doc.id,
          name: data.name || 'Store Register',
          username: data.username
        });
        setStep('auth');
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to query store database.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setIsLoading(true);
    setError(null);

    try {
      let loginEmail = '';
      if (!isStaff) {
        // Logging in as the Sub-Owner
        const sanitizedCode = resolvedStore?.username || storeCode.toLowerCase().trim();
        loginEmail = `${sanitizedCode}@sarisari.pos`;
      } else {
        // Logging in as a staff member (Cashier / Admin under this store)
        const sanitizedStaff = staffUsername.toLowerCase().trim().replace(/\s/g, '');
        if (!sanitizedStaff) {
          setError("Please provide your staff username.");
          setIsLoading(false);
          return;
        }
        // Unique username scoped to store context
        loginEmail = `${sanitizedStaff}_${resolvedStore?.uid || 'owner'}@sarisari.pos`;
      }

      await signInWithEmailAndPassword(auth, loginEmail, password);
    } catch (err: any) {
      console.error(err);
      setError("Invalid credentials for this register.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* System Administrator Developer Access (Tiny, clean button in Corner) */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/50 hover:bg-slate-800 hover:border-blue-500/40 px-3.5 py-2 rounded-xl text-xs font-black text-slate-300 transition-all uppercase tracking-wider"
          title="Sign in with developer profile"
        >
          {isLoading ? (
            <Loader2 className="animate-spin text-blue-500" size={12} />
          ) : (
            <Shield size={12} className="text-blue-400" />
          )}
          <span>System Admin Entry</span>
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-800"
      >
        <div className="bg-slate-950 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-[-10%] left-[-10%] w-40 h-40 bg-blue-500 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-40 h-40 bg-indigo-500 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20 rotate-3">
              <Store className="text-white" size={28} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-none">
              Sari-Sari <span className="text-blue-400">POS</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Enterprise POS Ecosystem</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm text-left"
            >
              <AlertCircle size={18} className="shrink-0" />
              <p className="font-medium text-xs uppercase tracking-tight">{error}</p>
            </motion.div>
          )}

          {step === 'store' ? (
            // STEP 1: CONNECT TO STORE REGISTER
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Enter Store Register</h2>
                <p className="text-xs text-slate-400">Specify your unique Store Code identifier to access the staff gate.</p>
              </div>

              <form onSubmit={handleConnectStore} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Store Code / Code Username</label>
                  <div className="relative">
                    <Compass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. luna-store" 
                      value={storeCode}
                      onChange={(e) => setStoreCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 pl-11 pr-4 py-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={16} /> : null}
                  <span>Next: User Authentication</span>
                </button>
              </form>
            </div>
          ) : (
            // STEP 2: USER LOG-IN (FOR OWNER OR STAFF)
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <button 
                  onClick={() => {
                    setStep('store');
                    setError(null);
                  }}
                  className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="text-left">
                  <span className="text-[8px] font-black tracking-widest uppercase bg-green-500/10 text-green-600 border border-green-500/20 px-2 py-0.5 rounded-full">Connected</span>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight mt-1">{resolvedStore?.name}</p>
                </div>
              </div>

              {/* Login Method Toggle Tab */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setIsStaff(false);
                    setError(null);
                  }}
                  className={cn(
                    "py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                    !isStaff ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Store Owner
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsStaff(true);
                    setError(null);
                  }}
                  className={cn(
                    "py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                    isStaff ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Internal Staff
                </button>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                {isStaff && (
                  <div className="space-y-1.5 animate-in fade-in duration-300">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff Username</label>
                    <input 
                      type="text" 
                      required
                      placeholder="cashier01" 
                      value={staffUsername}
                      onChange={(e) => setStaffUsername(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Password</label>
                    {isStaff && (
                      <span className="text-[9px] font-bold text-slate-400">Ask the Manager for details</span>
                    )}
                  </div>
                  <input 
                    type="password" 
                    required
                    placeholder="Enter Access Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={16} /> : null}
                  <span>Sign In Register</span>
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="p-5 bg-slate-50 text-center border-t border-slate-100 space-y-2">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none">
            Sari-Sari POS Ecosystem • Private Register
          </p>
          <div className="pt-2 border-t border-slate-200/60 text-[9px] text-slate-400">
            <span className="font-bold">System Creator:</span>{' '}
            <span className="font-extrabold text-slate-600">Loy Calang</span>
            <span className="mx-1 px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-black uppercase">Developer</span>
            <div className="mt-1">
              <span className="font-semibold text-slate-500">Contact:</span>{' '}
              <a href="mailto:calangloy@gmail.com" className="hover:underline text-blue-500 font-bold">calangloy@gmail.com</a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
