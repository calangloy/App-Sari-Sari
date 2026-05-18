import { useState } from 'react';
import { 
  History, 
  Search, 
  Trash2, 
  Edit2, 
  AlertTriangle, 
  CheckCircle2, 
  User as UserIcon,
  Clock,
  Filter
} from 'lucide-react';
import { useCollection } from '../lib/db';
import { orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface AuditRecord {
  id: string;
  action: string;
  details: string;
  user: string;
  timestamp: any;
  type: 'delete' | 'update' | 'security' | 'system';
}

export const AuditLogView = () => {
  const { data: logs, loading } = useCollection<AuditRecord>('audit_log', orderBy('timestamp', 'desc'), limit(100));
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search audit logs..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-4 py-2 rounded-lg">
          <History size={14} />
          <span>Showing Last 100 Actions</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">By User</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Loading logs...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No audit records found.</td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock size={12} className="text-slate-400" />
                          <span className="text-xs font-medium">{format(date, 'MMM d, h:mm a')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px]">
                              {log.user[0].toUpperCase()}
                           </div>
                           {log.user}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                          log.type === 'delete' ? "bg-red-100 text-red-600" :
                          log.type === 'update' ? "bg-blue-100 text-blue-600" :
                          log.type === 'security' ? "bg-amber-100 text-amber-600" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {log.type === 'delete' && <Trash2 size={10} />}
                          {log.type === 'update' && <Edit2 size={10} />}
                          {log.type === 'security' && <AlertTriangle size={10} />}
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
