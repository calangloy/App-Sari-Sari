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
  CheckCircle2
} from 'lucide-react';
import { useCollection, dbService } from '../lib/db';
import { SystemUser } from '../types';
import { orderBy, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const AdminManagementView = () => {
  const { data: users, loading } = useCollection<SystemUser>('users', orderBy('name'));
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    role: 'cashier' as const
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // In a real app without Admin SDK, we'd either use a Cloud Function
      // or just create the record in 'users' and wait for the user to login with that email.
      await dbService.add('users', {
        ...newUserData,
        createdAt: serverTimestamp()
      });
      setIsAddingUser(false);
      setNewUserData({ name: '', email: '', role: 'cashier' });
    } catch (error) {
      console.error(error);
      alert("Failed to add user. Ensure you are the owner.");
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

  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              placeholder="Search by name or email..." 
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
                          <p className="text-xs text-slate-500 mt-1">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.role}
                        onChange={(e) => updateRole(user.id, e.target.value)}
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border-none focus:ring-2 focus:ring-blue-500",
                          user.role === 'owner' ? "bg-amber-100 text-amber-600" :
                          user.role === 'admin' ? "bg-blue-100 text-blue-600" :
                          "bg-slate-100 text-slate-600"
                        )}
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="cashier">Cashier</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
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
            <h2 className="text-xl font-bold mb-1">Add New Team Member</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">
              Default Password: <span className="text-blue-600">Admin1234</span>
            </p>
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                <input 
                  required
                  type="email" 
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <option value="owner">Owner</option>
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
