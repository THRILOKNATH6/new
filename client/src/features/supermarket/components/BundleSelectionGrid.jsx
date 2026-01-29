import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, AlertOctagon, BarChart2 } from 'lucide-react';
import supermarketService from '../api/supermarketService';

const BundleSelectionGrid = ({ orderId, styleId, onSelectionChange }) => {
    const [bundles, setBundles] = useState([]);
    const [filteredBundles, setFilteredBundles] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [edits, setEdits] = useState({}); // { bundleId: { minus_qty, reason } }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchBundles();
    }, [orderId]);

    useEffect(() => {
        // Report selection changes to parent
        const selectionData = Array.from(selectedIds).map(id => {
            const bundle = bundles.find(b => b.bundle_id === id);
            const edit = edits[id] || { minus_qty: 0, reason: '' };
            return {
                ...bundle,
                minus_qty: edit.minus_qty,
                minus_reason: edit.reason,
                final_qty: bundle.qty - edit.minus_qty
            };
        });
        onSelectionChange(selectionData);
    }, [selectedIds, edits, bundles]);

    useEffect(() => {
        if (!search) {
            setFilteredBundles(bundles);
        } else {
            const q = search.toLowerCase();
            setFilteredBundles(bundles.filter(b =>
                b.bundle_id.toString().includes(q) ||
                b.size.toLowerCase().includes(q) ||
                (b.lay_no && b.lay_no.toString().includes(q))
            ));
        }
    }, [search, bundles]);

    const fetchBundles = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('[BundleGrid] Fetching bundles for orderId:', orderId);
            // Get all bundles for this order via Supermarket Service (Loading context)
            const res = await supermarketService.getBundles(orderId);
            console.log('[BundleGrid] API Response:', res);
            console.log('[BundleGrid] Bundles data:', res.data);

            // Filter out used bundles (those with loading_tx_id set)
            // Available = loading_tx_id is NULL
            const allBundles = res.data.data || res.data || [];
            console.log('[BundleGrid] All bundles:', allBundles);

            const available = allBundles.filter(b => !b.loading_tx_id);
            console.log('[BundleGrid] Available bundles:', available.length, available);

            setBundles(available);
            setFilteredBundles(available);
        } catch (err) {
            console.error('[BundleGrid] Error fetching bundles:', err);
            setError(`Failed to load bundles: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (bundleId) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(bundleId)) {
            newSet.delete(bundleId);
            // Clear edits if deselected
            const newEdits = { ...edits };
            delete newEdits[bundleId];
            setEdits(newEdits);
        } else {
            newSet.add(bundleId);
        }
        setSelectedIds(newSet);
    };

    const handleEdit = (bundleId, field, value) => {
        setEdits(prev => ({
            ...prev,
            [bundleId]: {
                ...prev[bundleId],
                [field]: value
            }
        }));
    };

    const selectAll = () => {
        if (selectedIds.size === filteredBundles.length) {
            setSelectedIds(new Set());
            setEdits({});
        } else {
            const allIds = new Set(filteredBundles.map(b => b.bundle_id));
            setSelectedIds(allIds);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400 text-xs font-bold animate-pulse">Scanning Warehouse Bundles...</div>;
    if (error) return <div className="p-8 text-center text-red-500 text-xs font-bold">{error}</div>;

    if (bundles.length === 0) return (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            <AlertOctagon className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="text-slate-500 text-xs font-black uppercase">No Available Bundles Found</p>
            <p className="text-slate-400 text-[10px]">All bundles for this order are already processed.</p>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search bundle no, size..."
                            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-blue-500 w-64"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-2"></div>
                    <div className="flex gap-2">
                        <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black uppercase text-slate-500">
                            Available: {bundles.length}
                        </div>
                        <div className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 text-[10px] font-black uppercase text-blue-600">
                            Selected: {selectedIds.size}
                        </div>
                    </div>
                </div>
                <button
                    onClick={selectAll}
                    className="text-[10px] font-black text-slate-500 uppercase hover:text-blue-600 underline"
                >
                    {selectedIds.size === filteredBundles.length ? 'Deselect All' : 'Select All Visible'}
                </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-12">
                                <div className="w-4 h-4 border-2 border-slate-300 rounded flex items-center justify-center cursor-pointer" onClick={selectAll}>
                                    {selectedIds.size > 0 && <div className="w-2 h-2 bg-slate-400 rounded-sm" />}
                                </div>
                            </th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Bundle ID</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Size</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Available Qty</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-32">Damage / Minus</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Reason</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Final Qty</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredBundles.map(b => {
                            const isSelected = selectedIds.has(b.bundle_id);
                            const edit = edits[b.bundle_id] || { minus_qty: 0, reason: '' };
                            const finalQty = b.qty - (parseInt(edit.minus_qty) || 0);

                            return (
                                <tr key={b.bundle_id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}>
                                    <td className="p-4">
                                        <div
                                            onClick={() => toggleSelection(b.bundle_id)}
                                            className={`w-4 h-4 border-2 rounded flex items-center justify-center cursor-pointer transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}
                                        >
                                            {isSelected && <CheckCircle size={10} className="text-white" />}
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-xs font-bold text-slate-600">#{b.bundle_id}</td>
                                    <td className="p-4 font-black text-xs text-slate-800 uppercase">{b.size}</td>
                                    <td className="p-4 font-mono text-xs font-bold text-slate-500">{b.qty}</td>

                                    <td className="p-4">
                                        <input
                                            type="number"
                                            min="0"
                                            max={b.qty}
                                            disabled={!isSelected}
                                            className={`w-full p-2 text-xs font-bold border rounded-lg outline-none text-center ${isSelected ? 'bg-white border-slate-300 focus:border-blue-500 text-red-600' : 'bg-slate-100 border-transparent text-slate-400'}`}
                                            value={edit.minus_qty || ''}
                                            placeholder={isSelected ? "0" : "-"}
                                            onChange={(e) => {
                                                const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), b.qty);
                                                handleEdit(b.bundle_id, 'minus_qty', val);
                                            }}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <select
                                            disabled={!isSelected || !edit.minus_qty}
                                            className={`w-full p-2 text-[10px] font-bold border rounded-lg outline-none bg-white ${isSelected && edit.minus_qty ? 'border-slate-300 text-slate-700' : 'border-transparent bg-transparent text-transparent'}`}
                                            value={edit.reason}
                                            onChange={(e) => handleEdit(b.bundle_id, 'reason', e.target.value)}
                                        >
                                            <option value="">Select Reason...</option>
                                            <option value="Damage">Damaged Piece</option>
                                            <option value="Missing">Missing Piece</option>
                                            <option value="Sample">Quality Sample</option>
                                        </select>
                                    </td>
                                    <td className="p-4 text-right font-mono text-xs font-black text-slate-800">
                                        {finalQty}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end gap-6 px-4 py-2 text-xs font-black uppercase text-slate-500">
                <p>Total Selected: <span className="text-blue-600">{selectedIds.size}</span></p>
                <p>Total Damage: <span className="text-red-500">-{Array.from(selectedIds).reduce((acc, id) => acc + (edits[id]?.minus_qty || 0), 0)}</span></p>
                <p>Net Loaded Qty: <span className="text-emerald-600">{Array.from(selectedIds).reduce((acc, id) => {
                    const b = bundles.find(bun => bun.bundle_id === id);
                    return acc + (b.qty - (edits[id]?.minus_qty || 0));
                }, 0)}</span></p>
            </div>
        </div>
    );
};

export default BundleSelectionGrid;
