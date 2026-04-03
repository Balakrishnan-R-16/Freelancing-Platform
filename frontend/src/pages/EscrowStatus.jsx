import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { ShieldCheck, CheckCircle2, RefreshCw, LayoutList, PlaySquare, AlertCircle, AlertTriangle, Ban, RotateCcw, XCircle, Link as LinkIcon, FileText, Image as ImageIcon } from 'lucide-react';
import SubmitWorkModal from '../components/SubmitWorkModal';
import { motion, AnimatePresence } from 'framer-motion';

const ESCROW_STATES = ['Deposit', 'Funded', 'Work Submitted', 'Approved', 'Completed'];

const pageVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};
const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 220, damping: 22 } }
};
const rowVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } }
};

export default function EscrowStatus() {
    const { token, user } = useAuth();
    const { lastEvent } = useRealtime();
    const [myContracts, setMyContracts]     = useState([]);
    const [selectedContract, setSelectedContract] = useState(null);
    const [loading, setLoading]             = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError]                 = useState('');
    const [confirmModal, setConfirmModal]   = useState(null);

    const fetchContracts = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/contracts/my', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const responseMap = await res.json();
                const data = responseMap.data || [];
                const mappedContracts = data.map(c => {
                    let step = 0;
                    if (c.status === 'FUNDED')         step = 1;
                    if (c.status === 'WORK_SUBMITTED') step = 2;
                    if (c.status === 'APPROVED')       step = 3;
                    if (c.status === 'COMPLETED')      step = 4;
                    return {
                        ...c,
                        jobTitle: c.job?.title || 'Unknown Job',
                        employer: c.employer?.fullName || 'Unknown Recruiter',
                        freelancer: c.freelancer?.fullName || 'Unknown Freelancer',
                        currentStep: step,
                        employerId: c.employer?.id,
                        freelancerId: c.freelancer?.id
                    };
                });
                mappedContracts.sort((a, b) => b.id - a.id);
                setMyContracts(mappedContracts);
                if (mappedContracts.length > 0 && !selectedContract) {
                    setSelectedContract(mappedContracts[0]);
                } else if (selectedContract) {
                    const updated = mappedContracts.find(c => c.id === selectedContract.id);
                    if (updated) setSelectedContract(updated);
                }
            }
        } catch (err) { console.error('Failed to fetch contracts', err); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) fetchContracts(); }, [token]);
    useEffect(() => {
        if (lastEvent?.type?.startsWith('contract_')) setTimeout(() => fetchContracts(), 500);
    }, [lastEvent]);

    const loadRazorpay = () => new Promise(resolve => {
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.body.appendChild(s);
    });

    const handleFund = async () => {
        setActionLoading(true); setError('');
        try {
            const res = await fetch(`/api/contracts/${selectedContract.id}/fund/initiate`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Failed to initiate funding');
            const transaction = result.data;
            const isLoaded = await loadRazorpay();
            if (!isLoaded) throw new Error('Razorpay SDK failed to load');
            const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_mock';
            if (rzpKey === 'rzp_test_mock') {
                setTimeout(async () => {
                    try {
                        const vRes = await fetch(`/api/contracts/${selectedContract.id}/fund/verify`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ razorpay_order_id: transaction.razorpayOrderId, razorpay_payment_id: 'pay_mock_' + Date.now(), razorpay_signature: 'mock_signature' }) });
                        const vResult = await vRes.json();
                        if (!vRes.ok) throw new Error(vResult.message || 'Verification failed');
                        await fetchContracts();
                    } catch (err) { setError(err.message); }
                    finally { setActionLoading(false); }
                }, 1000);
                return;
            }
            const rzp = new window.Razorpay({
                key: rzpKey, amount: transaction.amount * 100, currency: 'INR',
                name: 'Zyntra Escrow', description: `Funding for ${selectedContract.jobTitle}`,
                order_id: transaction.razorpayOrderId,
                handler: async (response) => {
                    try {
                        setActionLoading(true);
                        const vRes = await fetch(`/api/contracts/${selectedContract.id}/fund/verify`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }) });
                        const vResult = await vRes.json();
                        if (!vRes.ok) throw new Error(vResult.message || 'Verification failed');
                        await fetchContracts();
                    } catch (err) { setError(err.message); setActionLoading(false); }
                },
                theme: { color: '#D4AF37' }
            });
            rzp.on('payment.failed', r => { setError('Payment failed: ' + r.error.description); setActionLoading(false); });
            rzp.open();
        } catch (err) { setError(err.message); }
        finally { setActionLoading(false); }
    };

    const handleAction = async (endpoint, payload = null) => {
        setActionLoading(true); setError('');
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const options = { method: 'POST', headers };
            if (payload) { headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(payload); }
            const res = await fetch(`/api/contracts/${selectedContract.id}/${endpoint}`, options);
            const result = await res.json().catch(() => null);
            if (!res.ok) throw new Error(result?.message || `Failed to ${endpoint}`);
            await fetchContracts();
        } catch (err) { setError(err.message); }
        finally { setActionLoading(false); }
    };

    const handleReopenJob = async () => {
        if (!selectedContract?.job?.id) return;
        setActionLoading(true); setError('');
        try {
            const res = await fetch(`/api/contracts/jobs/${selectedContract.job.id}/reopen`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            const result = await res.json().catch(() => null);
            if (!res.ok) throw new Error(result?.message || 'Failed to reopen job');
            await fetchContracts();
        } catch (err) { setError(err.message); }
        finally { setActionLoading(false); }
    };

    const isEmployer   = user?.id === selectedContract?.employerId || user?.role === 'EMPLOYER';
    const isFreelancer = user?.id === selectedContract?.freelancerId || user?.role === 'FREELANCER';
    const isAdmin      = user?.role === 'ADMIN';
    const isDisputed   = selectedContract?.status === 'DISPUTED';
    const isRefunded   = selectedContract?.status === 'REFUNDED';
    const isTerminalBad = isDisputed || isRefunded || selectedContract?.status === 'FAILED' || selectedContract?.status === 'CANCELLED';

    const openConfirm = (type) => {
        const amount = selectedContract?.amount?.toLocaleString();
        const configs = {
            'submit-work':  { type, title: '📤 Submit Work for Review?',      body: 'Once submitted, the employer will be notified to review your deliverables.',                                                               confirmLabel: 'Yes, Submit Work',  danger: false },
            'approve-work': { type, title: '✅ Release Payment to Freelancer?', body: `This will permanently release ₹${amount} from escrow. This action cannot be reversed.`,                                                   confirmLabel: `Release ₹${amount}`, danger: true  },
            'dispute':      { type, title: '⚖️ Raise a Dispute?',              body: 'This will freeze the contract and lock all funds in escrow. An admin will review and make a final ruling.',                               confirmLabel: 'Yes, Raise Dispute', danger: true  },
        };
        setConfirmModal(configs[type]);
    };

    // ── Status badge styles (light-theme) ──────────────────────────────────────
    const getStatusBadge = (status) => {
        switch (status) {
            case 'CREATED':        return 'bg-gray-100 text-gray-600 border border-gray-200';
            case 'FUNDED':         return 'bg-amber-50 text-amber-700 border border-amber-200';
            case 'WORK_SUBMITTED': return 'bg-blue-50 text-blue-700 border border-blue-200';
            case 'APPROVED':       return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
            case 'COMPLETED':      return 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-[0_0_12px_rgba(5,150,105,0.12)]';
            case 'DISPUTED':       return 'bg-red-50 text-red-600 border border-red-200';
            case 'REFUNDED':
            case 'FAILED':         return 'bg-orange-50 text-orange-600 border border-orange-200';
            default:               return 'bg-gray-100 text-gray-500 border border-gray-200';
        }
    };

    return (
        <motion.div variants={pageVariants} initial="hidden" animate="show"
            className="min-h-screen bg-gray-50 text-gray-900 overflow-x-hidden relative">

            {/* Subtle top accent */}
            <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-blue-500 to-emerald-400 z-50 pointer-events-none" />

            {/* Background blobs */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-100/60 blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-amber-100/60 blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 pb-24">

                <SubmitWorkModal
                    isOpen={confirmModal?.type === 'submit-work'}
                    onClose={() => setConfirmModal(null)}
                    onSubmit={async (payload) => { setConfirmModal(null); await handleAction('submit-work', payload); }}
                    loading={actionLoading}
                    amount={selectedContract?.amount}
                />

                {/* Confirm Modal */}
                <AnimatePresence>
                    {confirmModal && confirmModal.type !== 'submit-work' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
                            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
                                className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-md p-7">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-gray-900 leading-snug pr-4">{confirmModal.title}</h3>
                                    <button onClick={() => setConfirmModal(null)} className="text-gray-400 hover:text-gray-700 transition-colors shrink-0">
                                        <XCircle size={22} />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed mb-6">{confirmModal.body}</p>
                                <div className="flex gap-3">
                                    <button onClick={async () => { const ep = confirmModal.type; setConfirmModal(null); await handleAction(ep); }}
                                        disabled={actionLoading}
                                        className={`flex-1 py-3 font-semibold rounded-xl transition-all disabled:opacity-50 text-sm ${
                                            confirmModal.danger
                                                ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
                                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                        }`}>
                                        {confirmModal.confirmLabel}
                                    </button>
                                    <button onClick={() => setConfirmModal(null)}
                                        className="px-5 py-3 bg-gray-100 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all text-sm">
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Page Header */}
                <motion.div variants={rowVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 flex items-center gap-4 mb-1">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-sm">
                                <ShieldCheck size={24} />
                            </div>
                            Smart Escrow
                        </h1>
                        <p className="text-gray-500 md:ml-16 text-sm">Securely track and manage your escrow contracts.</p>
                    </div>
                </motion.div>

                {/* Error */}
                {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 mb-6 flex items-center gap-3 shadow-sm">
                        <AlertCircle size={18} /> {error}
                    </motion.div>
                )}

                {/* Main Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                    {/* ── Left: Contract Detail ── */}
                    <div className="xl:col-span-2 flex flex-col gap-8">
                        <AnimatePresence mode="wait">
                            {selectedContract ? (
                                <motion.div
                                    key={selectedContract.id}
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                                    className={`bg-white border rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden ${
                                        isDisputed ? 'border-red-200 shadow-red-100' :
                                        isRefunded ? 'border-orange-200' : 'border-gray-200'
                                    }`}>

                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-5 pb-5 border-b border-gray-100">
                                        <div>
                                            <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-1.5">Active Contract</div>
                                            <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{selectedContract.jobTitle}</h3>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusBadge(selectedContract.status)}`}>
                                            {selectedContract.status}
                                        </span>
                                    </div>

                                    {/* Disputed Banner */}
                                    {isDisputed && (
                                        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-8 flex items-start gap-4">
                                            <AlertTriangle className="text-red-500 shrink-0 mt-1" size={20} />
                                            <div>
                                                <h4 className="font-bold text-red-700 mb-1">Dispute Active</h4>
                                                <p className="text-sm text-red-500">Funds are locked in escrow while an admin reviews the case.</p>
                                                {isAdmin && (
                                                    <div className="flex gap-3 mt-4">
                                                        <button onClick={() => handleAction('resolve-release')} disabled={actionLoading}
                                                            className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 text-sm shadow-sm">
                                                            ✅ Release to Freelancer
                                                        </button>
                                                        <button onClick={() => handleAction('resolve-refund')} disabled={actionLoading}
                                                            className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-all disabled:opacity-50 text-sm shadow-sm">
                                                            ↩️ Refund to Employer
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Refunded Banner */}
                                    {isRefunded && (
                                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-8 flex items-start gap-4">
                                            <Ban className="text-orange-500 shrink-0 mt-1" size={20} />
                                            <div className="flex-1">
                                                <h4 className="font-bold text-orange-700 mb-1">Contract Refunded</h4>
                                                <p className="text-sm text-orange-600 mb-3">Funds have been returned to the employer. The job has been reopened.</p>
                                                {isEmployer && selectedContract?.job?.status === 'IN_PROGRESS' && (
                                                    <button onClick={handleReopenJob} disabled={actionLoading}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all text-sm shadow-sm">
                                                        <RotateCcw size={14} /> Reopen Job Manually
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Progress Stepper */}
                                    {!isTerminalBad && (
                                        <div className="relative mb-2 mt-4 py-2">
                                            {/* Track */}
                                            <div className="absolute top-1/2 left-6 right-6 h-[2px] bg-gray-200 -translate-y-1/2 z-0 hidden md:block rounded-full overflow-hidden">
                                                <motion.div
                                                    className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-amber-400 via-blue-500 to-emerald-500 rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(selectedContract.currentStep / (ESCROW_STATES.length - 1)) * 100}%` }}
                                                    transition={{ duration: 0.9, ease: 'easeOut' }}
                                                />
                                            </div>

                                            <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6 md:gap-0">
                                                {ESCROW_STATES.map((step, idx) => {
                                                    const isCompleted = idx < selectedContract.currentStep;
                                                    const isActive    = idx === selectedContract.currentStep;

                                                    let ringCls = 'border-gray-200 bg-white text-gray-400';
                                                    if (isActive || isCompleted) {
                                                        if (idx === 0)           ringCls = 'border-amber-400 bg-amber-50 text-amber-600';
                                                        else if (idx <= 2)       ringCls = 'border-blue-400 bg-blue-50 text-blue-600';
                                                        else                     ringCls = 'border-emerald-400 bg-emerald-50 text-emerald-700';
                                                    }
                                                    if (isCompleted) {
                                                        if (idx === 0)           ringCls = 'border-amber-500 bg-amber-500 text-white';
                                                        else if (idx <= 2)       ringCls = 'border-blue-500 bg-blue-500 text-white';
                                                        else                     ringCls = 'border-emerald-500 bg-emerald-500 text-white';
                                                    }

                                                    return (
                                                        <div key={step} className="flex md:flex-col items-center gap-4 md:gap-2 text-left md:text-center w-full md:w-28 shrink-0">
                                                            <motion.div
                                                                initial={{ scale: 0.8, opacity: 0 }}
                                                                animate={{ scale: isActive ? 1.1 : 1, opacity: 1 }}
                                                                transition={{ delay: idx * 0.08 }}
                                                                className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-sm border-2 shadow-sm ${ringCls}`}>
                                                                {isCompleted ? <CheckCircle2 size={18} strokeWidth={2.5} /> : idx + 1}
                                                            </motion.div>
                                                            <h4 className={`font-semibold text-sm ${isCompleted || isActive ? 'text-gray-800' : 'text-gray-400'}`}>{step}</h4>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Deliverables */}
                                    {(selectedContract.submissionNote || selectedContract.submissionLink) && (
                                        <motion.div variants={cardVariants} className="mb-8 p-6 bg-blue-50/60 border border-blue-100 rounded-2xl">
                                            <div className="flex items-center gap-2 mb-5">
                                                <PlaySquare size={16} className="text-blue-500" />
                                                <h3 className="font-bold text-gray-800">Submitted Work Details</h3>
                                            </div>
                                            <div className="space-y-5">
                                                {selectedContract.submissionLink && (() => {
                                                    try {
                                                        const links = JSON.parse(selectedContract.submissionLink);
                                                        if (Array.isArray(links)) return (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                {links.map((item, idx) => {
                                                                    let Icon = LinkIcon;
                                                                    if (item.type === 'File Upload') Icon = FileText;
                                                                    else if (item.type === 'Image') Icon = ImageIcon;
                                                                    return (
                                                                        <a key={idx} href={item.link} target="_blank" rel="noreferrer"
                                                                            className="flex items-center gap-3 p-4 bg-white border border-blue-200 hover:border-blue-400 rounded-xl transition-all group shadow-sm">
                                                                            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform shrink-0">
                                                                                <Icon size={15} />
                                                                            </div>
                                                                            <div className="overflow-hidden">
                                                                                <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                                                                                <p className="text-[10px] text-gray-400 uppercase tracking-widest">{item.type}</p>
                                                                            </div>
                                                                        </a>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    } catch {
                                                        return <a href={selectedContract.submissionLink} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-600 hover:underline break-all">{selectedContract.submissionLink}</a>;
                                                    }
                                                })()}
                                                {selectedContract.submissionNote && (
                                                    <div>
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Freelancer Note</div>
                                                        <p className="text-sm text-gray-600 leading-relaxed p-4 bg-white border border-blue-100 rounded-xl whitespace-pre-wrap font-mono shadow-sm">
                                                            {selectedContract.submissionNote}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Info Strip */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2 mt-4">
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Contract ID</div>
                                            <div className="font-mono text-sm text-gray-800 font-semibold">#{selectedContract.id}</div>
                                        </div>
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                            <div className="text-[10px] font-bold text-amber-600/80 uppercase tracking-widest mb-1">Locked Value</div>
                                            <div className="font-black text-xl text-amber-600">₹{selectedContract.amount.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Parties</div>
                                            <div className="text-xs font-medium text-gray-700 truncate mb-1"><span className="text-gray-400">Emp:</span> {selectedContract.employer}</div>
                                            <div className="text-xs font-medium text-gray-700 truncate"><span className="text-gray-400">Free:</span> {selectedContract.freelancer}</div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-4 border-t border-gray-100 pt-6">
                                        {selectedContract.status === 'CREATED' && isEmployer && (
                                            <button onClick={handleFund} disabled={actionLoading}
                                                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50">
                                                {actionLoading ? 'Processing...' : '💰 Fund Escrow to Begin'}
                                            </button>
                                        )}
                                        {selectedContract.status === 'FUNDED' && isFreelancer && (
                                            <button onClick={() => openConfirm('submit-work')} disabled={actionLoading}
                                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50">
                                                {actionLoading ? 'Processing...' : '📤 Submit Deliverables'}
                                            </button>
                                        )}
                                        {selectedContract.status === 'WORK_SUBMITTED' && isEmployer && (
                                            <button onClick={() => openConfirm('approve-work')} disabled={actionLoading}
                                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50">
                                                {actionLoading ? 'Processing...' : '✅ Approve & Release Pay'}
                                            </button>
                                        )}
                                        {(selectedContract.status === 'FUNDED' || selectedContract.status === 'WORK_SUBMITTED') && (
                                            <button onClick={() => openConfirm('dispute')} disabled={actionLoading}
                                                className="px-6 py-3 bg-white border border-gray-300 hover:border-red-300 hover:bg-red-50 text-gray-600 hover:text-red-600 font-bold rounded-xl transition-all disabled:opacity-50 shadow-sm">
                                                Raise Dispute
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="bg-white border border-gray-200 rounded-3xl p-16 text-center flex flex-col items-center justify-center min-h-[400px] shadow-sm">
                                    {loading ? (
                                        <><RefreshCw size={32} className="animate-spin mb-4 text-gray-400" /><p className="text-gray-500 font-medium">Syncing ledger...</p></>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center mb-4">
                                                <LayoutList size={28} className="text-gray-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-800 mb-2">No active contracts</h3>
                                            <p className="text-gray-500 text-sm">Escrow contracts appear here once funding is initiated.</p>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ── Right Column ── */}
                    <div className="flex flex-col gap-8">

                        {/* Ledger */}
                        <motion.div variants={cardVariants}
                            className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col max-h-[480px] shadow-sm">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                    <LayoutList size={15} className="text-gray-400" /> Escrow Ledger
                                </h3>
                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{myContracts.length}</span>
                            </div>
                            <div className="overflow-y-auto p-3 flex flex-col gap-2 flex-1">
                                {myContracts.length === 0 && !loading && (
                                    <div className="p-8 text-center text-gray-400 text-sm">No ledger history yet.</div>
                                )}
                                {myContracts.map(contract => (
                                    <motion.div
                                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                                        key={contract.id}
                                        onClick={() => setSelectedContract(contract)}
                                        className={`p-4 rounded-xl cursor-pointer transition-all border ${
                                            selectedContract?.id === contract.id
                                                ? 'bg-blue-50 border-blue-200 shadow-sm'
                                                : 'bg-gray-50/50 border-transparent hover:bg-gray-100 hover:border-gray-200'
                                        }`}>
                                        <div className="flex justify-between items-start mb-1.5">
                                            <h4 className="font-semibold text-gray-800 text-sm truncate max-w-[150px]">{contract.jobTitle}</h4>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusBadge(contract.status)}`}>
                                                {contract.status === 'CREATED' ? 'Open' : contract.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] text-gray-400">
                                                {isEmployer ? `Free: ${contract.freelancer}` : `Emp: ${contract.employer}`}
                                            </span>
                                            <span className="font-black text-amber-600 text-sm">₹{contract.amount.toLocaleString()}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* How It Works */}
                        <motion.div variants={cardVariants}
                            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-800 mb-5 flex items-center gap-2">
                                <ShieldCheck className="text-amber-500" size={16} /> How It Works
                            </h3>
                            <div className="space-y-5">
                                {[
                                    { n: 1, title: 'Deposit Secured',   desc: 'Funds are locked safely in escrow once payment initiates.' },
                                    { n: 2, title: 'Work Begins',        desc: 'Freelancer completes and submits deliverables for review.' },
                                    { n: 3, title: 'Employer Reviews',   desc: 'Recruiter inspects and approves the submitted work.' },
                                    { n: 4, title: 'Instant Payment',    desc: 'Funds are released immediately to the freelancer.', highlight: true }
                                ].map(step => (
                                    <div key={step.n} className="flex gap-4 items-start">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                            step.highlight ? 'bg-amber-100 border border-amber-300 text-amber-600' : 'bg-gray-100 border border-gray-200 text-gray-500'
                                        }`}>
                                            {step.n}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-xs mb-0.5 ${step.highlight ? 'text-amber-600' : 'text-gray-700'}`}>{step.title}</h4>
                                            <p className="text-[11px] text-gray-400 leading-relaxed">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
