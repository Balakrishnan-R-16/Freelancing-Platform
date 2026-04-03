import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    ShieldAlert, LogOut, AlertTriangle, CheckCircle,
    LayoutList, RefreshCw, XCircle
} from 'lucide-react';

export default function AdminDashboard() {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null); // holds contractId being acted on
    const [message, setMessage] = useState(null);

    // Guard: redirect non-admins
    useEffect(() => {
        if (user && user.role !== 'ADMIN') navigate('/login');
        if (!user) navigate('/admin/login');
    }, [user]);

    const fetchDisputes = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/contracts/disputed', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            setDisputes(result.data || []);
        } catch (err) {
            console.error('Failed to fetch disputes', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchDisputes();
    }, [token]);

    const resolveContract = async (contractId, action) => {
        setActionLoading(contractId + action);
        setMessage(null);
        try {
            const res = await fetch(`/api/contracts/${contractId}/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Action failed');
            setMessage({ type: 'success', text: result.message });
            fetchDisputes(); // Refresh list
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setActionLoading(null);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Admin Top Bar */}
            <div className="bg-background-secondary border-b border-border sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blockchain/10 border border-blockchain/30 flex items-center justify-center">
                            <ShieldAlert className="text-blockchain" size={16} />
                        </div>
                        <div>
                            <span className="font-extrabold text-foreground text-sm">Zyntra Admin</span>
                            <span className="ml-2 text-[10px] font-bold text-blockchain bg-blockchain/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Control Panel</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-foreground-muted hidden sm:block">
                            Logged in as <span className="text-foreground font-semibold">{user?.fullName}</span>
                        </span>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-foreground-muted hover:text-foreground hover:border-foreground/30 transition-all text-sm font-medium"
                        >
                            <LogOut size={15} /> Logout
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-10">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-extrabold text-foreground mb-1 flex items-center gap-3">
                        <AlertTriangle className="text-yellow-400" size={24} />
                        Dispute Resolution Center
                    </h1>
                    <p className="text-foreground-muted text-sm">Review and resolve all disputed escrow contracts. Your decision is final and logged.</p>
                </div>

                {/* Toast Message */}
                {message && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                        {message.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                        {message.text}
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-background-secondary border border-yellow-500/20 rounded-2xl p-5">
                        <div className="text-sm text-foreground-muted mb-1">Open Disputes</div>
                        <div className="text-3xl font-black text-yellow-400">{disputes.length}</div>
                    </div>
                    <div className="bg-background-secondary border border-border rounded-2xl p-5">
                        <div className="text-sm text-foreground-muted mb-1">Total Locked</div>
                        <div className="text-3xl font-black text-blockchain">
                            ₹{disputes.reduce((s, d) => s + (d.amount || 0), 0).toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-background-secondary border border-border rounded-2xl p-5">
                        <div className="text-sm text-foreground-muted mb-1">Admin</div>
                        <div className="text-lg font-bold text-foreground truncate">{user?.fullName}</div>
                    </div>
                </div>

                {/* Disputes Table */}
                <div className="bg-background-secondary border border-border rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <LayoutList className="text-foreground-muted" size={20} />
                            <h2 className="font-bold text-foreground">Disputed Contracts</h2>
                        </div>
                        <button
                            onClick={fetchDisputes}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-foreground-muted hover:text-foreground text-sm transition-all"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-16 flex flex-col items-center text-foreground-muted">
                            <RefreshCw size={28} className="animate-spin mb-4" />
                            <p>Loading disputes...</p>
                        </div>
                    ) : disputes.length === 0 ? (
                        <div className="p-16 text-center">
                            <CheckCircle size={48} className="text-green-400 mx-auto mb-4 opacity-60" />
                            <h3 className="text-lg font-bold text-foreground mb-1">No Active Disputes</h3>
                            <p className="text-foreground-muted text-sm">All contracts are running smoothly.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-background border-b border-border">
                                    <tr>
                                        <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Contract</th>
                                        <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Employer</th>
                                        <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Freelancer</th>
                                        <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Amount</th>
                                        <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {disputes.map((contract) => (
                                        <tr key={contract.id} className="border-b border-border/50 hover:bg-foreground/5 transition-colors">
                                            <td className="py-5 px-6">
                                                <div className="font-bold text-foreground">{contract.job?.title || 'Unknown Job'}</div>
                                                <div className="text-xs text-foreground-muted mt-0.5">Contract #{contract.id}</div>
                                            </td>
                                            <td className="py-5 px-6 text-sm text-foreground-muted">{contract.employer?.fullName}</td>
                                            <td className="py-5 px-6 text-sm text-foreground-muted">{contract.freelancer?.fullName}</td>
                                            <td className="py-5 px-6 font-black text-blockchain text-lg">
                                                ₹{(contract.amount || 0).toLocaleString()}
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex gap-2 flex-wrap">
                                                    <button
                                                        onClick={() => resolveContract(contract.id, 'resolve-release')}
                                                        disabled={actionLoading !== null}
                                                        className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-500 transition-all disabled:opacity-40 flex items-center gap-1.5"
                                                    >
                                                        {actionLoading === contract.id + 'resolve-release' ? (
                                                            <RefreshCw size={12} className="animate-spin" />
                                                        ) : <CheckCircle size={13} />}
                                                        Release to Freelancer
                                                    </button>
                                                    <button
                                                        onClick={() => resolveContract(contract.id, 'resolve-refund')}
                                                        disabled={actionLoading !== null}
                                                        className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-500 transition-all disabled:opacity-40 flex items-center gap-1.5"
                                                    >
                                                        {actionLoading === contract.id + 'resolve-refund' ? (
                                                            <RefreshCw size={12} className="animate-spin" />
                                                        ) : <XCircle size={13} />}
                                                        Refund to Employer
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
