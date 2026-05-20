import React, { useState } from 'react';
import { 
  Users, 
  Shield, 
  UserPlus, 
  Search, 
  MoreVertical, 
  Mail, 
  Award,
  Loader2,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  Key
} from 'lucide-react';
import { useCollection, dbService } from '../lib/db';
import { SystemUser } from '../types';
import { orderBy, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db, createInternalAuthUser, updateInternalAuthUserPassword } from '../lib/firebase';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const AdminManagementView = ({ currentUser }: { currentUser: SystemUser | null }) => {
  const { data: users, loading } = useCollection<SystemUser>('users', orderBy('name'));
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    username: '',
    role: 'cashier' as 'cashier' | 'admin' | 'owner'
  });

  // Inline Password Management states
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleSavePassword = async (userToUpdate: SystemUser) => {
    const freshPassword = newPasswordValue.trim();
    if (freshPassword.length < 4) {
      alert("Password must be at least 4 characters long.");
      return;
    }
    setIsSavingPassword(true);
    try {
      const uName = userToUpdate.uniqueUsername || userToUpdate.username;
      const currentPass = (userToUpdate as any).password || '1234';

      // Update in Firebase Auth (using our robust sandbox auth changer helper)
      await updateInternalAuthUserPassword(uName, currentPass, freshPassword);

      // Save into the Firestore document
      await dbService.update('users', userToUpdate.id, { password: freshPassword });

      setEditingUserId(null);
      alert('Password updated successfully!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update user password. Ensure it has at least 6 characters.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.username || !currentUser) return;
    try {
      const sanitizedUsername = newUserData.username.toLowerCase().trim().replace(/\s/g, '');
      let uniqueUsername = sanitizedUsername;
      
      const roleIsOwner = newUserData.role === 'owner';
      
      if (!roleIsOwner) {
        // Scoped to the current store to avoid global namespace conflicts
        const storeIdContext = currentUser.storeId || currentUser.id;
        uniqueUsername = `${sanitizedUsername}_${storeIdContext}`;
      }

      // 1. Create Auth user first with fixed password: 1234 (per request)
      const uid = await createInternalAuthUser(uniqueUsername, '1234');
      
      // 2. Create Firestore record with the SAME id
      await setDoc(doc(db, 'users', uid), {
        name: newUserData.name,
        username: sanitizedUsername,
        uniqueUsername: uniqueUsername,
        role: newUserData.role,
        password: '1234', // Stored so both managers and the developer can see & edit
        storeId: roleIsOwner ? uid : (currentUser.storeId || currentUser.id),
        createdAt: serverTimestamp()
      });

      setIsAddingUser(false);
      setNewUserData({ name: '', username: '', role: 'cashier' });
      alert(`Account created successfully! Login ID: ${sanitizedUsername} | Password: 1234`);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to add user.");
    }
  };

  const updateRole = async (userId: string, newRole: string) => {
    try {
      await dbService.update('users', userId, { role: newRole });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      await dbService.remove('users', id);
    } catch (error) {
      console.error(error);
      alert("Failed to delete user.");
    }
  };

  const resolvedStoreId = currentUser?.storeId || currentUser?.id;
  const filtered = users.filter(u => {
    const nameVal = u.name || '';
    const usernameVal = u.username || '';
    const matchesSearch = nameVal.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          usernameVal.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // System Developer / Administrator (isSupreme) can see all users globally
    if (currentUser?.isSupreme) return true;

    // Ordinary store manager/owner should only view members under their store scope
    const userStoreId = u.storeId || (u.role === 'owner' ? u.id : null);
    return userStoreId === resolvedStoreId;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin & Staff Management</h1>
          <p className="text-sm text-slate-500 font-medium">Control system access and user permissions</p>
        </div>
        <button 
          onClick={() => setIsAddingUser(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all font-bold text-sm shadow-xl shadow-blue-200"
        >
          <UserPlus size={18} />
          Add Team Member
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by name or username..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Password Manager</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((user) => (
                  <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 group-hover:bg-white group-hover:text-blue-500 transition-colors">
                          {user.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-none">{user.name}</p>
                          <p className="text-xs text-slate-500 mt-1">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.role}
                        onChange={(e) => updateRole(user.id, e.target.value)}
                        disabled={user.role === 'owner' && !currentUser?.isSupreme}
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border-none focus:ring-2 focus:ring-blue-500",
                          user.role === 'owner' ? "bg-amber-100 text-amber-600" :
                          user.role === 'admin' ? "bg-blue-100 text-blue-600" :
                          "bg-slate-100 text-slate-600",
                          (user.role === 'owner' && !currentUser?.isSupreme) && "opacity-85 cursor-not-allowed"
                        )}
                      >
                        {currentUser?.isSupreme && <option value="owner">Owner</option>}
                        {(user.role === 'owner' && !currentUser?.isSupreme) && <option value="owner">Owner</option>}
                        <option value="admin">Admin</option>
                        <option value="cashier">Cashier</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {editingUserId === user.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in duration-200">
                          <input
                            type="text"
                            value={newPasswordValue}
                            onChange={(e) => setNewPasswordValue(e.target.value)}
                            className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 animate-pulse"
                            placeholder="6+ chars"
                          />
                          <button
                            disabled={isSavingPassword}
                            onClick={() => handleSavePassword(user)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-all disabled:opacity-50"
                            title="Save"
                          >
                            {isSavingPassword ? (
                              <Loader2 className="animate-spin text-green-500" size={14} />
                            ) : (
                              <CheckCircle2 size={16} />
                            )}
                          </button>
                          <button
                            disabled={isSavingPassword}
                            onClick={() => setEditingUserId(null)}
                            className="p-2 text-slate-400 hover:bg-slate-55 rounded-xl transition-all"
                            title="Cancel"
                          >
                            <span className="text-[10px] font-black uppercase">Cancel</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/50">
                            {visiblePasswords[user.id] ? ((user as any).password || '1234') : '••••••••'}
                          </span>
                          <button
                            onClick={() => setVisiblePasswords({
                              ...visiblePasswords,
                              [user.id]: !visiblePasswords[user.id]
                            })}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                            title={visiblePasswords[user.id] ? "Hide password" : "Show password"}
                          >
                            {visiblePasswords[user.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={() => {
                              setEditingUserId(user.id);
                              setNewPasswordValue((user as any).password || '1234');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 border border-blue-100 rounded-lg transition-all"
                            title="Edit Password"
                          >
                            <Key size={10} />
                            <span>Edit</span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(user.role !== 'owner' || currentUser?.isSupreme) && (
                        <button 
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Role Permissions Card */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <Shield className="text-blue-400" size={20} />
              Role Permissions
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                   <Award size={14} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Owner</span>
                </div>
                <p className="text-xs text-slate-400">Full system control, database management, and staff hiring.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-400">
                   <Shield size={14} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Admin</span>
                </div>
                <p className="text-xs text-slate-400">Manage inventory, view sales reports, and edit products.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                   <CheckCircle2 size={14} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Cashier</span>
                </div>
                <p className="text-xs text-slate-400">Access POS for transactions and basic inventory lookup.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddingUser(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md bg-white rounded-[2rem] p-8 shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-6">Add New Team Member</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                <input 
                  required
                  type="text" 
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Username</label>
                <input 
                  required
                  type="text" 
                  value={newUserData.username}
                  onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="staff01"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Role</label>
                <select 
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin</option>
                  {currentUser?.isSupreme && <option value="owner">Owner (New Register Shop)</option>}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-200"
                >
                  Create Account
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
