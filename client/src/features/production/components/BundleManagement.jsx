import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, AlertCircle, CheckCircle } from 'lucide-react';
import bundleService from '../api/bundleService';

const BundleManagement = ({ orderId }) => {
    const [stats, setStats] = useState(null);
    const [bundles, setBundles] = useState([]);
    const [selectedSize, setSelectedSize] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        cuttingId: '',
        qty: '',
        startingNo: '',
        endingNo: ''
    });
    const [editingBundleId, setEditingBundleId] = useState(null);
    const [availableCuttingEntries, setAvailableCuttingEntries] = useState([]);

    useEffect(() => {
        fetchBundleStats();
    }, [orderId]);

    useEffect(() => {
        if (selectedSize) {
            fetchBundles(selectedSize);
        }
    }, [selectedSize]);

    const fetchBundleStats = async () => {
        try {
            setLoading(true);
            const res = await bundleService.getBundleStats(orderId);
            setStats(res.data.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch bundle statistics');
        } finally {
            setLoading(false);
        }
    };

    const fetchBundles = async (size) => {
        try {
            const res = await bundleService.getBundles(orderId, size);
            setBundles(res.data.data);
        } catch (err) {
            console.error('Failed to fetch bundles:', err);
        }
    };

    const fetchAvailableCuttingEntries = async (size) => {
        try {
            const res = await bundleService.getAvailableCuttingEntries(orderId, size);
            setAvailableCuttingEntries(res.data.data);
        } catch (err) {
            console.error('Failed to fetch available cutting entries:', err);
        }
    };

    const handleSizeSelect = async (size) => {
        setSelectedSize(size);
        setShowCreateForm(false);
        setEditingBundleId(null);
        setFormData({ cuttingId: '', qty: '', startingNo: '', endingNo: '' });
        await fetchAvailableCuttingEntries(size);
    };

    const handleCuttingEntryChange = async (cuttingId) => {
        setFormData(prev => ({ ...prev, cuttingId }));

        const entry = availableCuttingEntries.find(e => e.cutting_id === parseInt(cuttingId));
        if (entry && !editingBundleId) { // Only auto-fill if NOT editing
            try {
                const res = await bundleService.getNextBundleNumber(entry.style_id, entry.colour_code);
                const nextStart = res.data.data.nextStartingNumber;
                setFormData(prev => ({
                    ...prev,
                    startingNo: nextStart.toString()
                }));
            } catch (err) {
                console.error('Failed to get next bundle number:', err);
            }
        }
    };

    const handleQtyChange = (qty) => {
        const qtyNum = parseInt(qty) || 0;
        const startNum = parseInt(formData.startingNo) || 0;
        const endNum = startNum + qtyNum - 1;

        setFormData(prev => ({
            ...prev,
            qty: qty,
            endingNo: endNum > 0 ? endNum.toString() : ''
        }));
    };

    const handleEdit = (bundle) => {
        setEditingBundleId(bundle.bundle_id);
        setFormData({
            cuttingId: bundle.cutting_id.toString(),
            qty: bundle.qty.toString(),
            startingNo: bundle.starting_no.toString(),
            endingNo: bundle.ending_no.toString()
        });
        setShowCreateForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (bundleId) => {
        if (!window.confirm('Delete this bundle? This will free up the cut quantity.')) return;
        try {
            await bundleService.deleteBundle(bundleId);
            setSuccess('Bundle deleted successfully');
            await fetchBundleStats();
            await fetchBundles(selectedSize);
            await fetchAvailableCuttingEntries(selectedSize);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete bundle');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            const bundleData = {
                cuttingId: parseInt(formData.cuttingId),
                qty: parseInt(formData.qty),
                startingNo: parseInt(formData.startingNo),
                endingNo: parseInt(formData.endingNo)
            };

            if (editingBundleId) {
                await bundleService.updateBundle(editingBundleId, bundleData);
                setSuccess('Bundle updated successfully!');
            } else {
                await bundleService.createBundle(bundleData);
                setSuccess('Bundle created successfully!');
            }

            // Reset form and refresh data
            setFormData({ cuttingId: '', qty: '', startingNo: '', endingNo: '' });
            setShowCreateForm(false);
            setEditingBundleId(null);
            await fetchBundleStats();
            await fetchBundles(selectedSize);
            await fetchAvailableCuttingEntries(selectedSize);

            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save bundle');
        }
    };

    if (loading && !stats) {
        return (
            <div className="p-8 text-center text-slate-500 font-bold">
                Loading bundle data...
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-8 text-center text-slate-500">
                No data available
            </div>
        );
    }

    const selectedSizeStats = stats.sizes.find(s => s.size === selectedSize);

    return (
        <div className="flex flex-col gap-3">
            {/* Header */}
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">
                        Bundle Registry
                    </h1>
                    <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                        PO #{stats.orderId} • {stats.buyer} • {stats.styleId}
                    </p>
                </div>
            </header>

            {/* Error/Success Messages */}
            {error && (
                <div className="op-card bg-red-50 border-red-200 flex items-center gap-2 text-red-700">
                    <AlertCircle size={16} />
                    <span className="text-[12px] font-bold">{error}</span>
                </div>
            )}

            {success && (
                <div className="op-card bg-emerald-50 border-emerald-200 flex items-center gap-2 text-emerald-700">
                    <CheckCircle size={16} />
                    <span className="text-[12px] font-bold">{success}</span>
                </div>
            )}

            {/* Statistics Table */}
            <div className="op-card">
                <h3 className="text-[11px] font-black text-slate-600 uppercase mb-2">
                    Size-wise Bundling Progress
                </h3>
                <div className="overflow-x-auto">
                    <table className="op-table">
                        <thead>
                            <tr>
                                <th>Size</th>
                                <th className="text-right">Ordered</th>
                                <th className="text-right">Cut</th>
                                <th className="text-right">Bundled</th>
                                <th className="text-right">Available</th>
                                <th className="text-right">Completion</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.sizes.map((size) => (
                                <tr
                                    key={size.size}
                                    className={selectedSize === size.size ? 'bg-blue-50' : ''}
                                >
                                    <td className="font-black text-slate-800 tracking-tighter">{size.size}</td>
                                    <td className="text-right font-bold text-slate-500">{size.orderQty}</td>
                                    <td className="text-right font-bold text-blue-600">{size.cutQty}</td>
                                    <td className="text-right font-bold text-emerald-600">{size.bundledQty}</td>
                                    <td className="text-right font-black text-slate-900 bg-slate-50">{size.availableForBundling}</td>
                                    <td className="text-right">
                                        <div className="inline-flex items-center gap-1">
                                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${size.bundlingPercentage}%` }} />
                                            </div>
                                            <span className="text-[10px] font-black">{size.bundlingPercentage}%</span>
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <button
                                            onClick={() => handleSizeSelect(size.size)}
                                            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded transition-none ${selectedSize === size.size
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {selectedSize === size.size ? 'Active' : 'Manage'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-800 text-white font-black">
                                <td className="uppercase">Factory Total</td>
                                <td className="text-right">{stats.totalOrderQty}</td>
                                <td className="text-right">{stats.totalCutQty}</td>
                                <td className="text-right text-emerald-400">{stats.totalBundledQty}</td>
                                <td className="text-right">{stats.totalCutQty - stats.totalBundledQty}</td>
                                <td className="text-right">{stats.totalBundlingPercentage}%</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Size-Specific Bundle Management */}
            {selectedSize && selectedSizeStats && (
                <div className="op-card border-t-4 border-blue-600">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[13px] font-black text-slate-800 uppercase">
                            Administering Size: <span className="text-blue-600">{selectedSize}</span>
                        </h3>
                        {!showCreateForm && (
                            <button
                                onClick={() => {
                                    setEditingBundleId(null);
                                    setFormData({ cuttingId: '', qty: '', startingNo: '', endingNo: '' });
                                    setShowCreateForm(true);
                                }}
                                className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-none"
                            >
                                <Plus size={14} strokeWidth={3} />
                                New Bundle
                            </button>
                        )}
                    </div>

                    {/* Create / Edit Bundle Form */}
                    {showCreateForm && (
                        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-inner">
                            <h4 className="text-[11px] font-black text-blue-700 uppercase mb-4 flex items-center gap-2">
                                {editingBundleId ? <Edit2 size={12} /> : <Plus size={12} />}
                                {editingBundleId ? 'Modify Existing Bundle' : 'Initialize New Bundle'}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide">
                                        Source Batch (Lay)
                                    </label>
                                    <select
                                        value={formData.cuttingId}
                                        onChange={(e) => handleCuttingEntryChange(e.target.value)}
                                        required
                                        disabled={!!editingBundleId}
                                        className="w-full bg-white border border-slate-300 rounded px-2 py-2 text-[12px] font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-200"
                                    >
                                        <option value="">Select Lay</option>
                                        {availableCuttingEntries.map((entry) => (
                                            <option key={entry.cutting_id} value={entry.cutting_id}>
                                                Lay {entry.lay_no} (Avail: {entry.available_qty}/{entry.cutting_qty} PCS)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide">
                                        Bundle Size (PCS)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.qty}
                                        onChange={(e) => handleQtyChange(e.target.value)}
                                        min="1"
                                        required
                                        className="w-full bg-white border border-slate-300 rounded px-2 py-2 text-[12px] font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Enter qty"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide">
                                        Starting Sr#
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.startingNo}
                                        readOnly
                                        className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-2 text-[12px] font-bold text-slate-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wide">
                                        Ending Sr#
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.endingNo}
                                        readOnly
                                        className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-2 text-[12px] font-bold text-slate-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setEditingBundleId(null);
                                        setFormData({ cuttingId: '', qty: '', startingNo: '', endingNo: '' });
                                    }}
                                    className="px-6 py-2 bg-slate-200 text-slate-700 rounded text-[11px] font-black uppercase tracking-widest hover:bg-slate-300 transition-none"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white rounded text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-none"
                                >
                                    {editingBundleId ? 'Apply Update' : 'Finalize Bundle'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Existing Bundles List */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Package size={14} className="text-slate-400" />
                            <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                                Registered Bundles ({bundles.length})
                            </h4>
                        </div>
                        {bundles.length > 0 ? (
                            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                <table className="op-table">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th>Manifest</th>
                                            <th>Batch</th>
                                            <th className="text-right">Quantity</th>
                                            <th>Piece Range</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bundles.map((bundle) => (
                                            <tr key={bundle.bundle_id} className="hover:bg-slate-50 transition-none">
                                                <td className="font-black text-blue-600 select-all">#{bundle.bundle_id}</td>
                                                <td className="font-black text-slate-700 uppercase text-[10px]">LAY {bundle.lay_no}</td>
                                                <td className="text-right font-black text-slate-900">{bundle.qty} PCS</td>
                                                <td>
                                                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-600 border border-slate-200">
                                                        {bundle.starting_no} - {bundle.ending_no}
                                                    </span>
                                                </td>
                                                <td className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={() => handleEdit(bundle)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-none"
                                                            title="Edit parameters"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(bundle.bundle_id)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-none"
                                                            title="Delete allocation"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                <Package size={32} className="mx-auto mb-3 opacity-20" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">No bundles allocated for {selectedSize}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* No Size Selected */}
            {!selectedSize && (
                <div className="op-card text-center py-12 text-slate-400">
                    <Package size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-[12px] font-bold uppercase">Select a size to manage bundles</p>
                </div>
            )}
        </div>
    );
};

export default BundleManagement;
