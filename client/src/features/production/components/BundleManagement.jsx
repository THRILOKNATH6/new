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
        setFormData({ cuttingId: '', qty: '', startingNo: '', endingNo: '' });
        await fetchAvailableCuttingEntries(size);
    };

    const handleCuttingEntryChange = async (cuttingId) => {
        setFormData(prev => ({ ...prev, cuttingId }));

        const entry = availableCuttingEntries.find(e => e.cutting_id === parseInt(cuttingId));
        if (entry) {
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

    const handleCreateBundle = async (e) => {
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

            await bundleService.createBundle(bundleData);
            setSuccess('Bundle created successfully!');

            // Reset form and refresh data
            setFormData({ cuttingId: '', qty: '', startingNo: '', endingNo: '' });
            setShowCreateForm(false);
            await fetchBundleStats();
            await fetchBundles(selectedSize);
            await fetchAvailableCuttingEntries(selectedSize);

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create bundle');
        }
    };

    if (loading) {
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
                    <h2 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">
                        Bundle Management
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                        Order #{stats.orderId} - {stats.buyer} - {stats.styleId}
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
                <div className="op-card bg-green-50 border-green-200 flex items-center gap-2 text-green-700">
                    <CheckCircle size={16} />
                    <span className="text-[12px] font-bold">{success}</span>
                </div>
            )}

            {/* Statistics Table */}
            <div className="op-card">
                <h3 className="text-[11px] font-black text-slate-600 uppercase mb-2">
                    Bundle Statistics by Size
                </h3>
                <div className="overflow-x-auto">
                    <table className="op-table">
                        <thead>
                            <tr>
                                <th>Size</th>
                                <th className="text-right">Order Qty</th>
                                <th className="text-right">Cut Qty</th>
                                <th className="text-right">Bundled Qty</th>
                                <th className="text-right">Available</th>
                                <th className="text-right">Bundling %</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.sizes.map((size) => (
                                <tr
                                    key={size.size}
                                    className={selectedSize === size.size ? 'bg-blue-50' : ''}
                                >
                                    <td className="font-black text-slate-800">{size.size}</td>
                                    <td className="text-right font-bold text-slate-600">{size.orderQty}</td>
                                    <td className="text-right font-bold text-blue-600">{size.cutQty}</td>
                                    <td className="text-right font-bold text-green-600">{size.bundledQty}</td>
                                    <td className="text-right font-black text-slate-800">{size.availableForBundling}</td>
                                    <td className="text-right">
                                        <span className={`font-black ${size.bundlingPercentage >= 100 ? 'text-green-600' :
                                                size.bundlingPercentage >= 50 ? 'text-blue-600' :
                                                    'text-slate-600'
                                            }`}>
                                            {size.bundlingPercentage}%
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => handleSizeSelect(size.size)}
                                            disabled={size.availableForBundling === 0}
                                            className={`text-[11px] font-bold px-2 py-1 rounded transition-none ${size.availableForBundling > 0
                                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                }`}
                                        >
                                            {selectedSize === size.size ? 'Selected' : 'Select'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-100 font-black">
                                <td>TOTAL</td>
                                <td className="text-right">{stats.totalOrderQty}</td>
                                <td className="text-right text-blue-600">{stats.totalCutQty}</td>
                                <td className="text-right text-green-600">{stats.totalBundledQty}</td>
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
                <div className="op-card">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-[12px] font-black text-slate-800 uppercase">
                            Size {selectedSize} - Bundle Management
                        </h3>
                        {!showCreateForm && availableCuttingEntries.length > 0 && (
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1.5 rounded text-[11px] font-bold hover:bg-blue-600 transition-none"
                            >
                                <Plus size={14} />
                                Create Bundle
                            </button>
                        )}
                    </div>

                    {/* Create Bundle Form */}
                    {showCreateForm && (
                        <form onSubmit={handleCreateBundle} className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded">
                            <h4 className="text-[11px] font-black text-slate-700 uppercase mb-2">
                                Create New Bundle
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                        Cutting Entry (Lay)
                                    </label>
                                    <select
                                        value={formData.cuttingId}
                                        onChange={(e) => handleCuttingEntryChange(e.target.value)}
                                        required
                                        className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="">Select Lay</option>
                                        {availableCuttingEntries.map((entry) => (
                                            <option key={entry.cutting_id} value={entry.cutting_id}>
                                                Lay {entry.lay_no} - Available: {entry.available_qty} pcs
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                        Bundle Quantity
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.qty}
                                        onChange={(e) => handleQtyChange(e.target.value)}
                                        min="1"
                                        max={availableCuttingEntries.find(e => e.cutting_id === parseInt(formData.cuttingId))?.available_qty || 0}
                                        required
                                        disabled={!formData.cuttingId}
                                        className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
                                        placeholder="Enter quantity"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                        Starting No (Auto)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.startingNo}
                                        readOnly
                                        className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-1.5 text-[12px] font-bold text-slate-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                        Ending No (Auto)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.endingNo}
                                        readOnly
                                        className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-1.5 text-[12px] font-bold text-slate-600"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setFormData({ cuttingId: '', qty: '', startingNo: '', endingNo: '' });
                                    }}
                                    className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded text-[11px] font-bold hover:bg-slate-300 transition-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 bg-blue-500 text-white rounded text-[11px] font-bold hover:bg-blue-600 transition-none"
                                >
                                    Create Bundle
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Existing Bundles List */}
                    <div>
                        <h4 className="text-[11px] font-black text-slate-600 uppercase mb-2">
                            Existing Bundles ({bundles.length})
                        </h4>
                        {bundles.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="op-table">
                                    <thead>
                                        <tr>
                                            <th>Bundle ID</th>
                                            <th>Lay No</th>
                                            <th className="text-right">Quantity</th>
                                            <th>Range</th>
                                            <th>Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bundles.map((bundle) => (
                                            <tr key={bundle.bundle_id}>
                                                <td className="font-black text-blue-600">#{bundle.bundle_id}</td>
                                                <td className="font-bold text-slate-700">Lay {bundle.lay_no}</td>
                                                <td className="text-right font-black text-slate-800">{bundle.qty}</td>
                                                <td className="font-bold text-slate-600">
                                                    {bundle.starting_no} - {bundle.ending_no}
                                                </td>
                                                <td className="text-[11px] text-slate-500">
                                                    {new Date(bundle.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded border border-dashed border-slate-300">
                                <Package size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-[11px] font-bold uppercase">No bundles created yet for size {selectedSize}</p>
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
