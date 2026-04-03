import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, CheckCircle2, ShieldCheck, Link as LinkIcon, FileText,
    Image as ImageIcon, Plus, Trash2, ArrowRight,
    AlertCircle, UploadCloud, Paperclip
} from 'lucide-react';

const steps = [
    { id: 1, title: 'Deliverables' },
    { id: 2, title: 'Summary' },
    { id: 3, title: 'Review' }
];

const linkTypes = [
    { id: 'Project Link', icon: LinkIcon, label: 'Project Link', accept: null },
    { id: 'File Upload', icon: FileText, label: 'File Upload', accept: '.pdf,.doc,.docx,.txt,.zip,.csv,.xlsx' },
    { id: 'Image', icon: ImageIcon, label: 'Image', accept: 'image/*' },
];

export default function SubmitWorkModal({ isOpen, onClose, onSubmit, loading, amount }) {
    const [step, setStep] = useState(1);

    // Step 1: Deliverables
    const [deliverables, setDeliverables] = useState([]);
    const [linkInput, setLinkInput] = useState('');
    const [linkTitle, setLinkTitle] = useState('');
    const [selectedType, setSelectedType] = useState('Project Link');
    const [linkError, setLinkError] = useState('');
    const [fileUploading, setFileUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Step 2: Summary
    const [summary, setSummary] = useState({
        completed: '',
        features: '',
        testing: '',
        notes: ''
    });

    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setDeliverables([]);
            setLinkInput('');
            setLinkTitle('');
            setSelectedType('Project Link');
            setLinkError('');
            setFileUploading(false);
            setSummary({ completed: '', features: '', testing: '', notes: '' });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isFileType = selectedType === 'File Upload' || selectedType === 'Image';
    const currentTypeConfig = linkTypes.find(t => t.id === selectedType);

    // ── Handle file selection (File Upload & Image) ──
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLinkError('');
        setFileUploading(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const dataUrl = evt.target.result;
            setDeliverables(prev => [...prev, {
                id: Date.now().toString(),
                type: selectedType,
                link: dataUrl,
                title: linkTitle.trim() || file.name,
                fileName: file.name,
                fileSize: (file.size / 1024).toFixed(1) + ' KB'
            }]);
            setLinkTitle('');
            setFileUploading(false);
            // reset the file input so the same file can be re-selected if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.onerror = () => {
            setLinkError('Failed to read the file. Please try again.');
            setFileUploading(false);
        };
        reader.readAsDataURL(file);
    };

    // ── Handle URL-based link (Project Link) ──
    const handleAddLink = () => {
        setLinkError('');
        if (!linkInput.trim()) {
            setLinkError('Please enter a URL.');
            return;
        }
        try {
            new URL(linkInput);
        } catch (_) {
            setLinkError('Please enter a valid URL (e.g. https://github.com/...).');
            return;
        }

        setDeliverables(prev => [...prev, {
            id: Date.now().toString(),
            type: selectedType,
            link: linkInput.trim(),
            title: linkTitle.trim() || linkInput.trim().split('/').filter(Boolean).pop() || 'Link'
        }]);
        setLinkInput('');
        setLinkTitle('');
    };

    const handleRemoveLink = (id) => {
        setDeliverables(prev => prev.filter(d => d.id !== id));
    };

    const handleNext = () => {
        if (step === 1 && deliverables.length === 0) {
            setLinkError('Please add at least one deliverable.');
            return;
        }
        setLinkError('');
        setStep(s => Math.min(s + 1, 3));
    };

    const handlePrev = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = async () => {
        const payloadLinks = JSON.stringify(deliverables);
        const payloadNote = `**What was completed?**
${summary.completed || 'N/A'}

**Key features delivered**
${summary.features || 'N/A'}

**Testing instructions**
${summary.testing || 'N/A'}

**Notes or limitations**
${summary.notes || 'N/A'}`;

        await onSubmit({
            submissionLink: payloadLinks,
            submissionNote: payloadNote
        });
    };

    const fieldsFilled = [
        deliverables.length > 0,
        summary.completed.length > 10,
        summary.features.length > 5,
        summary.testing.length > 0
    ].filter(Boolean).length;
    const completenessScore = Math.floor((fieldsFilled / 4) * 100);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={!loading ? onClose : undefined}
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative bg-[#111111] border border-[#222222] rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]"
            >
                {/* Header & Stepper */}
                <div className="p-6 border-b border-[#222222] bg-[#161616]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">
                            <UploadCloud className="text-ai" size={24} />
                            Submit Work
                        </h2>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex justify-between items-center relative">
                        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-[#222222] -translate-y-1/2 z-0"></div>
                        <div
                            className="absolute left-0 top-1/2 h-0.5 bg-ai -translate-y-1/2 z-0 transition-all duration-500"
                            style={{ width: `${((step - 1) / 2) * 100}%` }}
                        ></div>

                        {steps.map((s) => {
                            const isCompleted = step > s.id;
                            const isActive = step === s.id;
                            return (
                                <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-lg ${
                                        isCompleted ? 'bg-ai text-white border-2 border-ai/50' :
                                        isActive ? 'bg-[#111111] border-2 border-ai text-ai scale-110 shadow-ai/20' :
                                        'bg-[#1A1A1A] border-2 border-[#333333] text-gray-500'
                                    }`}>
                                        {isCompleted ? <CheckCircle2 size={16} /> : s.id}
                                    </div>
                                    <span className={`text-xs font-bold ${isActive || isCompleted ? 'text-white' : 'text-gray-500'}`}>
                                        {s.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-6 overflow-y-auto flex-1">
                    <AnimatePresence mode="wait">

                        {/* ── STEP 1 ── */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Upload or Link Deliverables</h3>

                                    {/* Type selector — 3 columns now (Video removed) */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {linkTypes.map(({ id, icon: Icon, label }) => (
                                            <button
                                                key={id}
                                                onClick={() => {
                                                    setSelectedType(id);
                                                    setLinkError('');
                                                }}
                                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                                                    selectedType === id
                                                        ? 'border-ai bg-ai/10 text-ai'
                                                        : 'border-[#2A2A2A] bg-[#161616] text-gray-400 hover:border-gray-500 hover:text-white'
                                                }`}
                                            >
                                                <Icon size={20} className="mb-2" />
                                                <span className="text-xs font-bold">{label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Input area */}
                                    <div className="bg-[#161616] p-4 rounded-xl border border-[#2A2A2A]">
                                        {isFileType ? (
                                            /* ── File / Image picker ── */
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder="Custom title (optional)"
                                                    value={linkTitle}
                                                    onChange={(e) => setLinkTitle(e.target.value)}
                                                    className="w-full bg-[#111111] border border-[#333333] rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-ai"
                                                />

                                                {/* Hidden native file input */}
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept={currentTypeConfig?.accept}
                                                    className="hidden"
                                                    onChange={handleFileChange}
                                                />

                                                {/* Drag-drop / click zone */}
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={fileUploading}
                                                    className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#333333] hover:border-ai rounded-xl py-8 text-gray-400 hover:text-ai transition-all bg-[#111111] disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {fileUploading ? (
                                                        <>
                                                            <div className="w-6 h-6 border-2 border-ai border-t-transparent rounded-full animate-spin" />
                                                            <span className="text-sm font-semibold">Reading file…</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Paperclip size={28} />
                                                            <div className="text-center">
                                                                <p className="text-sm font-bold">Click to browse</p>
                                                                <p className="text-xs text-gray-600 mt-1">
                                                                    {selectedType === 'Image'
                                                                        ? 'PNG, JPG, GIF, WebP supported'
                                                                        : 'PDF, DOC, ZIP, CSV, XLS supported'}
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            /* ── URL input (Project Link) ── */
                                            <div className="flex flex-col md:flex-row gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="Title / Description (optional)"
                                                    value={linkTitle}
                                                    onChange={(e) => setLinkTitle(e.target.value)}
                                                    className="w-full md:w-1/3 bg-[#111111] border border-[#333333] rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-ai"
                                                />
                                                <div className="flex-1 flex gap-3">
                                                    <input
                                                        type="url"
                                                        placeholder="Paste URL here…"
                                                        value={linkInput}
                                                        onChange={(e) => {
                                                            setLinkInput(e.target.value);
                                                            setLinkError('');
                                                        }}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                                                        className="w-full bg-[#111111] border border-[#333333] rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-ai"
                                                    />
                                                    <button
                                                        onClick={handleAddLink}
                                                        className="bg-[#2A2A2A] hover:bg-[#333333] text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-1 shrink-0"
                                                    >
                                                        <Plus size={16} /> Add
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {linkError && (
                                            <p className="text-red-400 text-xs mt-3 flex items-center gap-1">
                                                <AlertCircle size={12} />{linkError}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Added items list */}
                                {deliverables.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase">Added Items ({deliverables.length})</h4>
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                            <AnimatePresence>
                                                {deliverables.map((item) => {
                                                    const IconComponent = linkTypes.find(t => t.id === item.type)?.icon || LinkIcon;
                                                    const isFile = item.type === 'File Upload' || item.type === 'Image';
                                                    return (
                                                        <motion.div
                                                            key={item.id}
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            className="flex items-center justify-between p-3 bg-[#161616] border border-[#2A2A2A] rounded-lg"
                                                        >
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                {item.type === 'Image' && item.link.startsWith('data:image') ? (
                                                                    <img
                                                                        src={item.link}
                                                                        alt={item.title}
                                                                        className="w-8 h-8 rounded-lg object-cover shrink-0 border border-[#333333]"
                                                                    />
                                                                ) : (
                                                                    <div className="w-8 h-8 rounded-lg bg-[#222222] flex items-center justify-center text-ai shrink-0">
                                                                        <IconComponent size={14} />
                                                                    </div>
                                                                )}
                                                                <div className="overflow-hidden">
                                                                    <p className="text-sm font-bold text-white truncate">{item.title}</p>
                                                                    <p className="text-xs text-gray-500 truncate">
                                                                        {isFile ? (item.fileSize ? `${item.type} · ${item.fileSize}` : item.type) : item.link}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemoveLink(item.id)}
                                                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ── STEP 2 ── */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">What was completed?</label>
                                    <textarea
                                        value={summary.completed}
                                        onChange={(e) => setSummary(prev => ({ ...prev, completed: e.target.value }))}
                                        placeholder="Describe the main objectives you achieved…"
                                        className="w-full bg-[#161616] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-ai min-h-[80px] resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Key features delivered</label>
                                    <textarea
                                        value={summary.features}
                                        onChange={(e) => setSummary(prev => ({ ...prev, features: e.target.value }))}
                                        placeholder="E.g., Authentication module, Responsive UI, Database optimizations…"
                                        className="w-full bg-[#161616] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-ai min-h-[80px] resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Testing instructions</label>
                                        <textarea
                                            value={summary.testing}
                                            onChange={(e) => setSummary(prev => ({ ...prev, testing: e.target.value }))}
                                            placeholder="How should the client test this?"
                                            className="w-full bg-[#161616] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-ai min-h-[80px] resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Notes or limitations</label>
                                        <textarea
                                            value={summary.notes}
                                            onChange={(e) => setSummary(prev => ({ ...prev, notes: e.target.value }))}
                                            placeholder="Any pending items or known limits?"
                                            className="w-full bg-[#161616] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-ai min-h-[80px] resize-none"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 3 ── */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="p-5 bg-ai/10 border border-ai/20 rounded-xl flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                            <ShieldCheck className="text-ai" /> Ready to Submit
                                        </h3>
                                        <p className="text-sm text-gray-400 mt-1">Review your deliverables before locking the submission.</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-ai">{completenessScore}%</div>
                                        <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Completeness</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase border-b border-[#2A2A2A] pb-2">Submission Summary</h4>
                                        <ul className="space-y-2">
                                            <li className="flex items-center gap-2 text-sm text-white">
                                                <CheckCircle2 size={16} className="text-ai" /> {deliverables.length} Deliverable(s) attached
                                            </li>
                                            <li className="flex items-center gap-2 text-sm text-white">
                                                <CheckCircle2 size={16} className="text-ai" /> Summary notes provided
                                            </li>
                                            {summary.testing.length > 5 && (
                                                <li className="flex items-center gap-2 text-sm text-white">
                                                    <CheckCircle2 size={16} className="text-ai" /> Testing instructions included
                                                </li>
                                            )}
                                        </ul>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase border-b border-[#2A2A2A] pb-2">Trust &amp; Safety</h4>
                                        <ul className="space-y-3">
                                            <li className="flex items-start gap-2 text-xs text-gray-300">
                                                <div className="w-5 h-5 rounded-full bg-[#DAA520]/20 flex items-center justify-center shrink-0 mt-0.5">
                                                    <ShieldCheck size={12} className="text-[#DAA520]" />
                                                </div>
                                                Payment of ₹{amount?.toLocaleString() || 'held'} securely locked in escrow.
                                            </li>
                                            <li className="flex items-start gap-2 text-xs text-gray-300">
                                                <div className="w-5 h-5 rounded-full bg-[#DAA520]/20 flex items-center justify-center shrink-0 mt-0.5">
                                                    <ShieldCheck size={12} className="text-[#DAA520]" />
                                                </div>
                                                Employer review required and dispute options available.
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#222222] bg-[#161616] flex justify-between items-center">
                    <button
                        onClick={step === 1 ? onClose : handlePrev}
                        disabled={loading}
                        className="px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white transition-colors"
                    >
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>

                    {step < 3 ? (
                        <button
                            onClick={handleNext}
                            className="bg-ai hover:bg-ai/90 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-ai/20 transition-all flex items-center gap-2"
                        >
                            Continue <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || deliverables.length === 0}
                            className="bg-[#DAA520] hover:bg-[#B8860B] disabled:opacity-50 disabled:cursor-not-allowed text-black px-8 py-2.5 rounded-lg font-black text-sm shadow-lg shadow-[#DAA520]/20 transition-all flex items-center gap-2"
                        >
                            {loading ? 'Processing…' : <><CheckCircle2 size={16} /> Confirm &amp; Submit Work</>}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
