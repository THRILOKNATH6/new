import React, { useState, useEffect } from 'react';
import { UserCheck, Search, CheckCircle, Truck, ArrowRight, X, AlertTriangle, RefreshCw, BarChart3, Fingerprint } from 'lucide-react';
import supermarketService from '../api/supermarketService';
import cuttingService from '../../production/api/cuttingService';
import * as ieService from '../../ie/api/ieService';

import BundleSelectionGrid from './BundleSelectionGrid';

const LoadingWizard = ({ onSuccess, onCancel, initialTransaction = null }) => {
    const [step, setStep] = useState(initialTransaction ? 3 : 1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Step 1: Employee Verification
    const [empId, setEmpId] = useState('');
    const [creator, setCreator] = useState(null);

    // Step 2: Recommendation & Selection
    const [lines, setLines] = useState([]);
    const [selectedLine, setSelectedLine] = useState(initialTransaction?.line_no || '');
    const [recommendation, setRecommendation] = useState(null);
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [quantities, setQuantities] = useState({});
    const [bundles, setBundles] = useState([]); // New Bundle State
    const [transaction, setTransaction] = useState(initialTransaction);

    useEffect(() => {
        if (initialTransaction) {
            console.log('[LoadingWizard] Resuming transaction:', initialTransaction);
            // Hydrate state for Resume Mode
            const qty = {};
            // Extract sizes from transaction object (excluding non-size keys)
            const nonSizeKeys = ['loading_id', 'order_id', 'line_no', 'created_by', 'approved_by', 'handover_by', 'approved_status', 'created_date', 'approved_date', 'handover_date', 'style_id', 'colour_code', 'full_order_id', 'line_name', 'creator_name', 'approver_name', 'handover_name', 'category', 'size_category_name'];

            Object.keys(initialTransaction).forEach(key => {
                if (!nonSizeKeys.includes(key) && initialTransaction[key] !== null) {
                    qty[key] = initialTransaction[key];
                }
            });

            setQuantities(qty);
            setSelectedLine(initialTransaction.line_no); // Set the line number
            setSelectedOrder({
                order_id: initialTransaction.order_id,
                style_id: initialTransaction.style_id,
                colour_code: initialTransaction.colour_code,
                size_category_name: initialTransaction.category // Passed from dashboard list
            });
            setTransaction(initialTransaction);
            // Skip directly to Step 3
            setStep(3);
            console.log('[LoadingWizard] Resume complete - Step 3, Line:', initialTransaction.line_no);
        } else {
            // Check for existing Creator session or previous entry if needed (optional)
        }
    }, [initialTransaction]);

    // Step 3: Approval
    const [approverId, setApproverId] = useState('');
    const [approver, setApprover] = useState(null);

    // Step 4: Handover
    const [handoverId, setHandoverId] = useState('');
    const [handoverEmp, setHandoverEmp] = useState(null);
    const [variantStyleId, setVariantStyleId] = useState('');

    useEffect(() => {
        if (step === 2) {
            fetchLines();
        }
    }, [step]);

    const fetchLines = async () => {
        try {
            const res = await supermarketService.getLines();
            const data = res.data.data;
            // RULE: Fetch and display ONLY ACTIVE lines.
            // API now returns { line_no, line_name, status } directly
            const activeLines = data.filter(l => l.status === 'ACTIVE');
            setLines(activeLines || []);
        } catch (err) {
            setError('Failed to fetch production lines');
        }
    };

    const handleVerifyCreator = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await supermarketService.verifyEmployee(empId);
            const employee = res.data.data;
            // RULE: ANY employee from the Production Department (ID 1) can initiate.
            if (employee.department_id !== 1) throw new Error('Creator must belong to Production department');
            if (employee.designation_level > 7) throw new Error('Insufficient designation level to initiate transaction (1-7 required)');
            setCreator(employee);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLineChange = async (lineNo) => {
        setSelectedLine(lineNo);
        setRecommendation(null);
        setSelectedOrder(null);
        if (!lineNo) return;

        setLoading(true);
        try {
            const res = await supermarketService.getRecommendation(lineNo);
            setRecommendation(res.data.data);
            // RULE: If NO loading transaction exists, allow manual selection (handled below by selectedOrder state)
        } catch (err) {
            console.error('Recommendation failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchOrders = async (query) => {
        console.log('[LoadingWizard] Search triggered with query:', query, 'Length:', query.length);
        if (query.length < 3) {
            console.log('[LoadingWizard] Query too short, skipping search');
            return;
        }

        try {
            console.log('[LoadingWizard] Calling supermarketService.searchOrders with:', { order_id: query });
            const res = await supermarketService.searchOrders({ order_id: query });
            console.log('[LoadingWizard] Search response:', res);
            console.log('[LoadingWizard] Response data:', res.data);
            console.log('[LoadingWizard] Response data.data:', res.data?.data);
            console.log('[LoadingWizard] Orders array:', res.data?.data?.orders);

            // Response structure: { success: true, data: { orders: [...], pagination: {...} } }
            const orders = res.data?.data?.orders || [];
            console.log('[LoadingWizard] Setting orders:', orders.length, 'results', orders);
            setOrders(orders);
        } catch (err) {
            console.error('[LoadingWizard] Order search failed:', err);
            console.error('[LoadingWizard] Error details:', err.response?.data || err.message);
            setOrders([]);
        }
    };

    const handleOrderSelect = async (order) => {
        console.log('[LoadingWizard] Order selected:', order);
        setSelectedOrder(order);
        setQuantities({});
        setBundles([]); // Clear any previous bundle selection

        // Initialize quantities with 0 for order sizes
        const initial = {};
        if (order.sizes) {
            const sizes = order.sizes.split(',').map(s => s.trim());
            sizes.forEach(s => initial[s.toLowerCase()] = 0);
            setQuantities(initial);
            console.log('[LoadingWizard] Initialized quantities for sizes:', sizes);
        } else {
            console.warn('[LoadingWizard] Order has no sizes field!', order);
        }
    };

    const handleCreateTransaction = async () => {
        setLoading(true);
        setError(null);
        try {
            // Prepare bundle data for backend
            const bundlePayload = bundles.map(b => ({
                bundleId: b.bundle_id,
                minusQty: parseInt(b.minus_qty) || 0,
                reason: b.minus_reason || ''
            }));

            const res = await supermarketService.createTransaction({
                employeeId: creator.emp_id,
                lineNo: selectedLine,
                orderId: selectedOrder.order_id,
                quantities,
                bundles: bundlePayload
            });
            setTransaction(res.data.data);
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyApprover = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await supermarketService.verifyEmployee(approverId);
            const employee = res.data.data;
            // RULE: Approval allowed by any employee with designation level 1–7 (Any department)
            if (employee.designation_level > 7) throw new Error('Approver designation must be level 1-7');
            setApprover(employee);
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        setLoading(true);
        setError(null);
        try {
            await supermarketService.approveTransaction(transaction.loading_id, selectedOrder.size_category_name, approver.emp_id);
            setStep(4);
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyHandover = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await supermarketService.verifyEmployee(handoverId);
            const employee = res.data.data;
            if (employee.department_id !== 1) throw new Error('Handover must be to Production department employee');
            if (employee.designation_level > 7) throw new Error('Handover recipient must be level 1-7');

            // Special rule: style change
            if (variantStyleId && variantStyleId !== selectedOrder.style_id) {
                if (employee.designation_level > 5) {
                    throw new Error('Style changes require designation level 5 or below');
                }
            }

            setHandoverEmp(employee);
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async () => {
        setLoading(true);
        setError(null);
        try {
            await supermarketService.handoverTransaction(transaction.loading_id, selectedOrder.size_category_name, handoverEmp.emp_id, variantStyleId);
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderProgress = () => (
        <div className="flex items-center justify-between mb-8 px-4">
            {[1, 2, 3, 4].map(s => (
                <div key={s} className="flex flex-col items-center gap-2 relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all ${step >= s ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                        {step > s ? <CheckCircle size={20} /> : s}
                    </div>
                    <span className={`text-[10px] uppercase font-black tracking-widest ${step >= s ? 'text-blue-600' : 'text-slate-400'}`}>
                        {s === 1 ? 'Verify' : s === 2 ? 'Select' : s === 3 ? 'Approve' : 'Handover'}
                    </span>
                    {s < 4 && <div className={`absolute left-12 top-5 w-24 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-slate-100'}`} />}
                </div>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                <header className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Initialize Loading Transaction</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Supermarket Handover Workflow</p>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X size={20} /></button>
                </header>

                <div className="p-8 overflow-y-auto flex-1 bg-white">
                    {renderProgress()}

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r flex items-center gap-3">
                            <AlertTriangle className="text-red-500 shrink-0" size={20} />
                            <p className="text-[13px] font-bold text-red-700">{error}</p>
                        </div>
                    )}

                    {/* STEP 1: VERIFY CREATOR */}
                    {step === 1 && (
                        <div className="max-w-md mx-auto space-y-6">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Fingerprint size={40} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 uppercase">Employee Verification</h3>
                                <p className="text-slate-500 text-sm font-medium">Enter your Employee ID to initiate the supermarket loading.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="EMP-XXXX"
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-600 outline-none font-black text-lg transition-all"
                                        value={empId}
                                        onChange={(e) => setEmpId(e.target.value.toUpperCase())}
                                        onKeyDown={e => e.key === 'Enter' && handleVerifyCreator()}
                                    />
                                    <UserCheck className="absolute left-4 top-4 text-slate-400" size={24} />
                                </div>

                                {creator && (
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-black">
                                                {creator.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 uppercase text-[13px]">{creator.name}</p>
                                                <p className="text-[11px] font-bold text-emerald-600 uppercase">{creator.designation_name} • {creator.department_name}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={creator ? () => setStep(2) : handleVerifyCreator}
                                    disabled={loading || !empId}
                                    className="w-full bg-slate-800 hover:bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest text-[13px] shadow-lg shadow-slate-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={18} /> : creator ? 'Access Granted - Proceed' : 'Verify Credentials'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: LOADING RECOMMENDATION & SELECTION */}
                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Target Production Line</label>
                                    <select
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-slate-800 focus:border-blue-600 outline-none transition-all"
                                        value={selectedLine}
                                        onChange={(e) => handleLineChange(e.target.value)}
                                    >
                                        <option value="">Select Target Line</option>
                                        {lines.map(l => (
                                            <option key={l.line_no} value={l.line_no}>{l.line_name}</option>
                                        ))}
                                    </select>

                                    {loading && (
                                        <div className="flex items-center gap-3 text-blue-600 font-bold text-[12px] animate-pulse">
                                            <RefreshCw className="animate-spin" size={16} />
                                            ANALYZING LINE HISTORY...
                                        </div>
                                    )}

                                    {recommendation && (
                                        <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl space-y-4">
                                            <div className="flex items-center gap-2 text-blue-800">
                                                <BarChart3 size={18} />
                                                <h4 className="text-[12px] font-black uppercase tracking-tight">System Recommendation</h4>
                                            </div>

                                            {recommendation.recommendation ? (
                                                <div className="space-y-3">
                                                    <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Recommended Style</p>
                                                        <p className="font-black text-slate-800 text-lg uppercase tracking-tight">{recommendation.recommendation.data.style_id}</p>
                                                        <div className="flex gap-4 mt-2">
                                                            <div>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Colour</p>
                                                                <p className="font-black text-[12px] text-slate-700">{recommendation.recommendation.data.colour_code}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Available Cut</p>
                                                                <p className="font-black text-[12px] text-green-600">{recommendation.recommendation.data.total_cut} PCS</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleOrderSelect({
                                                            order_id: recommendation.recommendation.data.order_id,
                                                            style_id: recommendation.recommendation.data.style_id,
                                                            sizes: "XXS,XS,S,M,L,XL,XXL", // Fallback sizes, ideally should comes from API
                                                            size_category_name: "XXS-XXL" // Ideal case
                                                        })}
                                                        className="w-full py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700"
                                                    >
                                                        Apply Recommendation
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-blue-700 text-xs font-bold">{recommendation.message}</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Manual Order Selection</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search by Order ID..."
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-600 outline-none font-bold"
                                            onChange={(e) => handleSearchOrders(e.target.value)}
                                        />
                                        <Search className="absolute left-4 top-4 text-slate-400" size={24} />
                                    </div>

                                    {orders.length > 0 && (
                                        <div className="max-h-48 overflow-y-auto border-2 border-slate-100 rounded-xl divide-y">
                                            {orders.map(o => (
                                                <button
                                                    key={o.order_id}
                                                    onClick={() => handleOrderSelect(o)}
                                                    className={`w-full p-3 text-left hover:bg-blue-50 transition-colors flex justify-between items-center ${selectedOrder?.order_id === o.order_id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                                                >
                                                    <div>
                                                        <p className="font-black text-slate-800 text-[13px]">PO #{o.order_id}</p>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase">{o.style_id} • {o.buyer}</p>
                                                    </div>
                                                    <ArrowRight size={16} className="text-slate-300" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedOrder && (
                                <div className="border-t border-slate-200 pt-8 animate-in slide-in-from-top-4">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">Active Selection: <span className="text-blue-600">PO #{selectedOrder.order_id} ({selectedOrder.style_id})</span></h4>
                                        <button onClick={() => { setSelectedOrder(null); setQuantities({}); setBundles([]); }} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Clear Selection</button>
                                    </div>

                                    {/* Bundle Selection Grid */}
                                    {console.log('[LoadingWizard] Rendering BundleSelectionGrid with orderId:', selectedOrder.order_id)}
                                    <BundleSelectionGrid
                                        orderId={selectedOrder.order_id}
                                        styleId={selectedOrder.style_id}
                                        onSelectionChange={(selectedBundles) => {
                                            console.log('[LoadingWizard] Bundle selection changed:', selectedBundles.length, 'bundles');
                                            setBundles(selectedBundles);
                                            // Calculate aggregates for display/legacy
                                            const aggs = {};
                                            selectedBundles.forEach(b => {
                                                const size = b.size.toLowerCase();
                                                aggs[size] = (aggs[size] || 0) + b.final_qty;
                                            });
                                            setQuantities(aggs);
                                        }}
                                    />

                                    <div className="mt-8 flex justify-end">
                                        <button
                                            onClick={handleCreateTransaction}
                                            disabled={loading || !selectedLine || !selectedOrder || bundles.length === 0}
                                            className="px-10 py-4 bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest text-[12px] hover:bg-black transition-all flex items-center gap-3 disabled:opacity-30"
                                        >
                                            {loading ? <RefreshCw className="animate-spin" size={18} /> : (
                                                <>
                                                    Commit to Approval
                                                    <ArrowRight size={18} />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: APPROVAL */}
                    {step === 3 && selectedOrder && (
                        <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 text-center">
                            <div>
                                <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <UserCheck size={40} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Supermarket Authorization</h3>
                                <p className="text-slate-500 text-sm font-medium">A designated supervisor (Level 1-7) must approve this loading transaction.</p>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-2xl text-left space-y-4 border border-slate-100 shadow-inner">
                                <div className="flex justify-between items-center text-[11px] font-black text-slate-400 uppercase">
                                    <span>Transaction Review</span>
                                    <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded">Pending Approval</span>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Order Details</p>
                                        <p className="font-black text-slate-800">#{selectedOrder?.order_id || 'N/A'}</p>
                                        <p className="text-xs font-medium text-slate-500">{selectedOrder?.style_id || 'N/A'} / {selectedOrder?.colour_code || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Destination</p>
                                        <p className="font-black text-slate-800">LINE {selectedLine || 'N/A'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Quantities Allocated</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(quantities).map(([s, q]) => q > 0 && (
                                                <span key={s} className="bg-white border px-2 py-1 rounded text-[10px] font-black">{s.toUpperCase()}: {q}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Approver ID (EMP-XXXX)"
                                        className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none font-black text-lg transition-all"
                                        value={approverId}
                                        onChange={(e) => setApproverId(e.target.value.toUpperCase())}
                                        onBlur={handleVerifyApprover}
                                    />
                                    <UserCheck className="absolute left-4 top-5 text-slate-400" size={24} />
                                </div>

                                {approver && (
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl animate-in zoom-in-95 text-left">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-black">{approver.name.charAt(0)}</div>
                                            <div>
                                                <p className="font-black text-slate-800 uppercase text-[12px]">{approver.name}</p>
                                                <p className="text-[10px] font-bold text-emerald-600 uppercase">{approver.designation_name} (Level {approver.designation_level})</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            supermarketService.rejectTransaction(transaction.loading_id, selectedOrder.size_category_name);
                                            onCancel();
                                        }}
                                        className="w-1/3 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 py-4 rounded-xl font-black uppercase text-[11px] transition-all"
                                    >
                                        Reject & Void
                                    </button>
                                    <button
                                        onClick={handleApprove}
                                        disabled={loading || !approver}
                                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[12px] shadow-lg shadow-amber-100 flex items-center justify-center gap-2 disabled:opacity-30"
                                    >
                                        {loading ? <RefreshCw className="animate-spin" size={18} /> : (
                                            <>
                                                Confirm Authorization
                                                <ArrowRight size={18} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: HANDOVER */}
                    {step === 4 && (
                        <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 text-center">
                            <div>
                                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Truck size={40} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Production Handover</h3>
                                <p className="text-slate-500 text-sm font-medium">Final verification by Production department staff to complete loading.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alternative Running Style (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold uppercase focus:border-emerald-500 outline-none"
                                        placeholder="Enter style ID if different from master..."
                                        value={variantStyleId}
                                        onChange={(e) => setVariantStyleId(e.target.value.toUpperCase())}
                                    />
                                    {variantStyleId && variantStyleId !== selectedOrder.style_id && (
                                        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-[10px] font-bold flex items-center gap-2">
                                            <AlertTriangle size={14} />
                                            SECURITY RULE: LEVEL 5 OR BELOW EMPLOYEE REQUIRED FOR STYLE CHANGE
                                        </div>
                                    )}
                                </div>

                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Production Employee ID"
                                        className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none font-black text-lg transition-all"
                                        value={handoverId}
                                        onChange={(e) => setHandoverId(e.target.value.toUpperCase())}
                                        onBlur={handleVerifyHandover}
                                    />
                                    <UserCheck className="absolute left-4 top-5 text-slate-400" size={24} />
                                </div>

                                {handoverEmp && (
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl animate-in zoom-in-95 text-left">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-black">{handoverEmp.name.charAt(0)}</div>
                                            <div>
                                                <p className="font-black text-slate-800 uppercase text-[12px]">{handoverEmp.name}</p>
                                                <p className="text-[10px] font-bold text-emerald-600 uppercase">{handoverEmp.designation_name} (Level {handoverEmp.designation_level})</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleFinalize}
                                    disabled={loading || !handoverEmp}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[12px] shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 transition-all disabled:opacity-30"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={18} /> : (
                                        <>
                                            Complete Final Loading
                                            <CheckCircle size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoadingWizard;
