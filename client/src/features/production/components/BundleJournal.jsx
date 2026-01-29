import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Trash2, Edit2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import bundleService from '../api/bundleService';

const BundleJournal = () => {
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ styleId: '', orderId: '', buyer: '' });
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const res = await bundleService.getRecords(filters);
            setRecords(res.data.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch bundle records');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this bundle? This action cannot be undone and will only work if the bundle hasn\'t been scanned.')) return;

        try {
            await bundleService.deleteBundle(id);
            setRecords(records.filter(r => r.bundle_id !== id));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete bundle');
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchRecords();
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <form onSubmit={handleSearch} className="op-card grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Style ID</label>
                    <input
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[12px] font-bold outline-none focus:border-blue-500"
                        value={filters.styleId}
                        onChange={e => setFilters({ ...filters, styleId: e.target.value })}
                        placeholder="Search style..."
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Order #</label>
                    <input
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[12px] font-bold outline-none focus:border-blue-500"
                        value={filters.orderId}
                        onChange={e => setFilters({ ...filters, orderId: e.target.value })}
                        placeholder="Order ID..."
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Buyer</label>
                    <input
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[12px] font-bold outline-none focus:border-blue-500"
                        value={filters.buyer}
                        onChange={e => setFilters({ ...filters, buyer: e.target.value })}
                        placeholder="Buyer name..."
                    />
                </div>
                <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-slate-800 text-white rounded py-2 text-[11px] font-black uppercase tracking-wider hover:bg-black transition-none">
                        Filter Bundles
                    </button>
                    <button type="button" onClick={fetchRecords} className="p-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </form>

            {error && (
                <div className="bg-red-50 border border-red-200 p-3 rounded text-[12px] text-red-700 font-bold flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            <div className="op-card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="op-table">
                        <thead>
                            <tr>
                                <th>Bundle ID</th>
                                <th>Order / Style</th>
                                <th>Lay No</th>
                                <th>Size</th>
                                <th className="text-right">Qty</th>
                                <th>Range</th>
                                <th className="text-right">Ops</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center py-10 text-slate-400 font-bold italic uppercase tracking-widest text-[11px]">Syncing bundle history...</td></tr>
                            ) : records.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-10 text-slate-400">No bundles found.</td></tr>
                            ) : (
                                records.map(record => (
                                    <tr key={record.bundle_id}>
                                        <td className="font-black text-blue-600">#{record.bundle_id}</td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">#{record.full_order_id}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase">{record.style_id}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="font-bold text-slate-700">LAY {record.lay_no}</span>
                                        </td>
                                        <td className="font-black text-slate-600">{record.size}</td>
                                        <td className="text-right font-black text-[14px] text-slate-900">{record.qty}</td>
                                        <td>
                                            <div className="flex items-center gap-2 text-[11px]">
                                                <Layers size={10} className="text-slate-400" />
                                                <span className="font-mono font-bold text-slate-500">{record.starting_no} - {record.ending_no}</span>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => navigate(`/dashboard/production/cutting/${record.full_order_id}?tab=bundles`)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Edit Bundle"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(record.bundle_id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                    title="Delete Bundle"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BundleJournal;
