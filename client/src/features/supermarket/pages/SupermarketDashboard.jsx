import React, { useState, useEffect } from 'react';
import { Package, Truck, Clock, CheckCircle, Plus, AlertCircle, RefreshCw, Filter, Search, ChevronRight } from 'lucide-react';
import supermarketService from '../api/supermarketService';
import LoadingWizard from '../components/LoadingWizard';
import { useAuth } from '@/context/AuthContext';

const SupermarketDashboard = () => {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState('LOADING'); // LOADING, DASHBOARD, PRODUCTION, DENIED
    const [data, setData] = useState({ transactions: [], pending: [], pendingHandover: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showWizard, setShowWizard] = useState(false);
    const [pendingItem, setPendingItem] = useState(null);

    useEffect(() => {
        const init = async () => {
            if (!user?.employeeId) return;

            try {
                // Check Access Level
                const verifyRes = await supermarketService.verifyEmployee(user.employeeId);
                const emp = verifyRes.data.data;

                if (emp.department_id === 10 && emp.designation_level <= 7) {
                    setViewMode('DASHBOARD');
                    fetchDashboardData();
                } else if (emp.department_id === 1) {
                    setViewMode('PRODUCTION');
                    setLoading(false);
                } else {
                    setViewMode('DENIED');
                    setError('Access Denied: This module is restricted to Supermarket & Production personnel.');
                    setLoading(false);
                }
            } catch (err) {
                setError('Failed to verify user permissions.');
                setViewMode('DENIED');
                setLoading(false);
            }
        };

        init();
    }, [user]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const res = await supermarketService.getDashboard();
            setData(res.data.data);
            setError(null);
        } catch (err) {
            setError('Failed to synchronize supermarket data');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const StatusBadge = ({ status }) => {
        const styles = {
            'PENDING_APPROVAL': 'bg-amber-100 text-amber-700 border-amber-200',
            'APPROVED': 'bg-blue-100 text-blue-700 border-blue-200',
            'COMPLETED': 'bg-emerald-100 text-emerald-700 border-emerald-200'
        };
        return (
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${styles[status] || 'bg-slate-100'}`}>
                {status?.replace('_', ' ') || 'UNKNOWN'}
            </span>
        );
    };

    // -------------------------------------------------------------------------
    // Render States
    // -------------------------------------------------------------------------

    if (viewMode === 'LOADING' || (viewMode === 'DASHBOARD' && loading && data.transactions.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-slate-500 font-black uppercase tracking-widest text-[11px]">Verifying Operational Access...</div>
            </div>
        );
    }

    if (viewMode === 'DENIED') {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-6 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                    <AlertCircle size={32} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase">Access Restricted</h2>
                    <p className="text-slate-500 text-sm font-medium mt-2 max-w-md">{error}</p>
                </div>
            </div>
        );
    }

    if (viewMode === 'PRODUCTION') {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-8 text-center min-h-[60vh]">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-4">
                    <Truck size={40} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Supermarket Loading Interface</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Production Department • Initiation Terminal</p>
                </div>
                <button
                    onClick={() => { setPendingItem(null); setShowWizard(true); }}
                    className="bg-blue-600 hover:bg-black text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[13px] flex items-center gap-3 transition-all shadow-xl shadow-blue-100 hover:scale-105 active:scale-95"
                >
                    <Plus size={20} strokeWidth={3} />
                    Initialize New Transaction
                </button>

                {showWizard && (
                    <LoadingWizard
                        initialTransaction={null}
                        onSuccess={() => { setShowWizard(false); }}
                        onCancel={() => setShowWizard(false)}
                    />
                )}
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // Main Dashboard View (Supermarket Only)
    // -------------------------------------------------------------------------

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                        <Truck size={28} className="text-blue-600" />
                        Supermarket Handover Dashboard
                    </h1>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Loading Transaction Management • Operating Tier 1</p>
                </div>
                <button
                    onClick={() => { setPendingItem(null); setShowWizard(true); }}
                    className="bg-blue-600 hover:bg-black text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[12px] flex items-center gap-2 transition-all shadow-lg shadow-blue-100"
                >
                    <Plus size={18} strokeWidth={3} />
                    Create New Transaction
                </button>
            </header>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Package size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Active</p>
                        <p className="text-2xl font-black text-slate-800">{data.transactions.length + data.pending.length + data.pendingHandover.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Approvals</p>
                        <p className="text-2xl font-black text-slate-800">{data.pending.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <RefreshCw size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Handover</p>
                        <p className="text-2xl font-black text-slate-800">{data.pendingHandover.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed Transactions</p>
                        <p className="text-2xl font-black text-slate-800">{data.transactions.length}</p>
                    </div>
                </div>
            </div>

            {/* Pending Approvals Table */}
            {data.pending.length > 0 && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6">
                    <h3 className="text-[12px] font-black text-amber-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <AlertCircle size={16} />
                        Priority: Awaiting Management Approval
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.pending.map(t => (
                            <div key={t.loading_id} className="bg-white border border-amber-200 p-4 rounded-xl shadow-sm space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[14px] font-black text-slate-800">PO #{t.full_order_id}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Line: {t.line_name}</p>
                                    </div>
                                    <StatusBadge status={t.approved_status} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-slate-600 uppercase">{t.style_id} / {t.colour_code}</p>
                                    <p className="text-[10px] text-slate-400 font-medium italic">Requested by {t.creator_name}</p>
                                </div>
                                <button
                                    onClick={() => { setPendingItem(t); setShowWizard(true); }}
                                    className="w-full py-2 bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-700"
                                >
                                    Proceed to Step 3
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pending Handover Section */}
            {data.pendingHandover.length > 0 && (
                <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-6">
                    <h3 className="text-[12px] font-black text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <RefreshCw size={16} />
                        Ready for Step 4: Handover Execution
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.pendingHandover.map(t => (
                            <div key={t.loading_id} className="bg-white border border-blue-200 p-4 rounded-xl shadow-sm space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[14px] font-black text-slate-800">PO #{t.full_order_id}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Line: {t.line_name}</p>
                                    </div>
                                    <StatusBadge status={t.approved_status} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-slate-600 uppercase">{t.style_id} / {t.colour_code}</p>
                                    <p className="text-[10px] text-slate-400 font-medium italic">Created by {t.creator_name}</p>
                                    {t.approver_name && (
                                        <p className="text-[10px] text-slate-400 font-medium italic">Approved by {t.approver_name}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => { setPendingItem(t); setShowWizard(true); }}
                                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700"
                                >
                                    Complete Step 4 Handover
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Historical Transaction Ledger */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">Handover Transaction Ledger</h3>
                    <div className="flex gap-2">
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><Filter size={18} /></button>
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><Search size={18} /></button>
                    </div>
                </header>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/20">
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">TX ID</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Order Info</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Destination</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Stage Status</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Activity Log</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.transactions.map(t => (
                                <tr key={t.loading_id} className="hover:bg-slate-50 group transition-all">
                                    <td className="px-6 py-4">
                                        <span className="font-mono font-black text-[12px] text-slate-400">#LST-{t.loading_id.toString().padStart(4, '0')}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-black text-slate-800 text-[13px]">PO #{t.full_order_id}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{t.style_id} • {t.colour_code}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-700 text-[12px]">{t.line_name.replace(/\D/g, '')}</div>
                                            <span className="font-black text-slate-600 text-[12px] uppercase">{t.line_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={t.approved_status} />
                                    </td>
                                    <td className="px-6 py-4 text-right shrink-0">
                                        <div className="flex flex-col items-end gap-1">
                                            <p className="text-[11px] font-black text-slate-700">{formatDate(t.created_date)}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                {t.creator_name} <ChevronRight size={10} /> {t.handover_name || '...'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {data.transactions.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <Package size={48} className="mx-auto text-slate-200 mb-4" />
                                        <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">No transaction records found in system</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showWizard && (
                <LoadingWizard
                    initialTransaction={pendingItem}
                    onSuccess={() => { setShowWizard(false); setPendingItem(null); fetchDashboardData(); }}
                    onCancel={() => { setShowWizard(false); setPendingItem(null); }}
                />
            )}
        </div>
    );
};

export default SupermarketDashboard;
