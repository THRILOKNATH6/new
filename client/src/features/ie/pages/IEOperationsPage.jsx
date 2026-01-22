import { useState, useEffect } from 'react';
import { Target, Plus, Edit2, Trash2, Save, X, Info, User, Clock, Search, Layers, ChevronDown, Activity, Settings2, Cpu } from 'lucide-react';
import * as ieAPI from '../api/ieService';
import { useAuth } from '@/context/AuthContext';

export default function IEOperationsPage() {
    const { user } = useAuth();
    const [sizeCategories, setSizeCategories] = useState([]);
    const [styles, setStyles] = useState([]);
    const [selectedSizeCat, setSelectedSizeCat] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('');
    const [operations, setOperations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingOp, setEditingOp] = useState(null);

    const [formData, setFormData] = useState({
        operation_name: '',
        operation_sequence: '',
        machine_type: '',
        sam: '0.000',
        cutting_part_no: '',
        sizes: {}
    });

    useEffect(() => {
        loadMasters();
    }, []);

    const loadMasters = async () => {
        try {
            const data = await ieAPI.getIEMasters();
            setSizeCategories(data.sizeCategories || []);
            setStyles(data.styles || []);
        } catch (e) {
            console.error('Failed to load masters', e);
        }
    };

    const loadOperations = async () => {
        if (!selectedSizeCat || !selectedStyle) return;
        setLoading(true);
        try {
            const data = await ieAPI.getOperations(selectedSizeCat, selectedStyle);
            setOperations(data || []);
        } catch (e) {
            console.error('Failed to load operations', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOperations();
    }, [selectedSizeCat, selectedStyle]);

    const activeSizeCatDef = sizeCategories.find(c => c.size_category_id == selectedSizeCat);
    const availableSizes = activeSizeCatDef ? activeSizeCatDef.sizes.split(',').map(s => s.trim().toLowerCase()).filter(s => s) : [];

    const handleOpenCreate = () => {
        setEditingOp(null);
        setFormData({
            operation_name: '',
            operation_sequence: (operations.length > 0 ? Math.max(...operations.map(o => o.operation_sequence)) + 1 : 1).toString(),
            machine_type: '',
            sam: '0.000',
            cutting_part_no: '',
            sizes: availableSizes.reduce((acc, s) => ({ ...acc, [s]: '' }), {})
        });
        setModalOpen(true);
    };

    const handleOpenEdit = (op) => {
        setEditingOp(op);
        const sizeVals = {};
        availableSizes.forEach(s => {
            sizeVals[s] = op[s] !== null ? op[s].toString() : '';
        });
        setFormData({
            operation_name: op.operation_name,
            operation_sequence: op.operation_sequence.toString(),
            machine_type: op.machine_type || '',
            sam: op.sam,
            cutting_part_no: op.cutting_part_no || '',
            sizes: sizeVals
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                sizeCategoryId: selectedSizeCat,
                style_id: selectedStyle,
                operation_name: formData.operation_name,
                operation_sequence: parseInt(formData.operation_sequence, 10),
                machine_type: formData.machine_type,
                sam: parseFloat(formData.sam),
                cutting_part_no: formData.cutting_part_no ? parseInt(formData.cutting_part_no, 10) : null,
                ...Object.keys(formData.sizes).reduce((acc, s) => ({
                    ...acc,
                    [s]: formData.sizes[s] === '' ? null : parseInt(formData.sizes[s], 10)
                }), {})
            };

            if (editingOp) {
                await ieAPI.updateOperation(editingOp.operation_id, payload);
            } else {
                await ieAPI.createOperation(payload);
            }
            setModalOpen(false);
            loadOperations();
        } catch (err) {
            alert(err.response?.data?.message || 'Save failed');
        }
    };

    const handleDelete = async (op) => {
        if (!window.confirm('Are you sure you want to delete this operation?')) return;
        try {
            await ieAPI.deleteOperation(op.operation_id, selectedSizeCat);
            loadOperations();
        } catch (err) {
            alert(err.response?.data?.message || 'Delete failed');
        }
    };

    const canDelete = (op) => {
        if (user?.role === 'IE Manager' || user?.role === 'SYSTEM_ADMIN') return true;
        return op.created_by === user?.employeeId;
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="w-8 h-8 text-blue-400" />
                        Operation Master Management
                    </h1>
                    <p className="text-gray-400">Define SAM and size-wise numeric counts per operation</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">IE Manager Access</span>
                </div>
            </div>

            {/* Selectors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-4 space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase">1. Select Size Category</label>
                    <select
                        value={selectedSizeCat}
                        onChange={(e) => setSelectedSizeCat(e.target.value)}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all"
                    >
                        <option value="">-- Choose Category --</option>
                        {sizeCategories.map(c => (
                            <option key={c.size_category_id} value={c.size_category_id}>{c.size_category_name}</option>
                        ))}
                    </select>
                </div>

                <div className="glass-card p-4 space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase">2. Select Style</label>
                    <select
                        value={selectedStyle}
                        onChange={(e) => setSelectedStyle(e.target.value)}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all"
                    >
                        <option value="">-- Choose Style --</option>
                        {styles.map(s => (
                            <option key={s.style_id} value={s.style_id}>{s.style_name} ({s.style_id})</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-end pb-1">
                    <button
                        onClick={handleOpenCreate}
                        disabled={!selectedSizeCat || !selectedStyle}
                        className="w-full h-[50px] bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-blue-900/20 group"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                        Add New Operation
                    </button>
                </div>
            </div>

            {/* Operations List */}
            {!selectedSizeCat || !selectedStyle ? (
                <div className="glass-card p-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center">
                        <Settings2 className="w-8 h-8 text-gray-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">No Selection</h3>
                        <p className="text-gray-400 max-w-sm">Please select a size category and style to view and manage operation sequences.</p>
                    </div>
                </div>
            ) : loading ? (
                <div className="flex justify-center p-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-800/50">
                                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700">Seq</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700">Operation Name</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700">Machine</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700">SAM</th>
                                    {availableSizes.map(s => (
                                        <th key={s} className="px-4 py-3 text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-gray-700 text-center">{s}</th>
                                    ))}
                                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700">History</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {operations.map((op) => (
                                    <tr key={op.operation_id} className="hover:bg-white/5 transition-colors border-b border-gray-800/50 group">
                                        <td className="px-4 py-4 text-sm font-bold text-blue-400">{op.operation_sequence}</td>
                                        <td className="px-4 py-4">
                                            <div className="font-semibold text-white">{op.operation_name}</div>
                                            {op.cutting_part_no && <div className="text-[10px] text-gray-500 uppercase">Part: #{op.cutting_part_no}</div>}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-400">{op.machine_type || '-'}</td>
                                        <td className="px-4 py-4">
                                            <span className="bg-gray-900 text-green-400 px-2 py-1 rounded-md text-sm font-mono tracking-tight border border-green-500/20">
                                                {parseFloat(op.sam).toFixed(3)}
                                            </span>
                                        </td>
                                        {availableSizes.map(s => (
                                            <td key={s} className="px-4 py-4 text-center">
                                                {op[s] !== null ? (
                                                    <span className="text-sm font-mono text-white">{op[s]}</span>
                                                ) : (
                                                    <span className="text-gray-700">--</span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                    <User className="w-3 h-3" /> {op.created_by}
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-blue-500/70">
                                                    <Clock className="w-3 h-3" /> {op.last_changed_by}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenEdit(op)}
                                                    className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {canDelete(op) && (
                                                    <button
                                                        onClick={() => handleDelete(op)}
                                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {operations.length === 0 && (
                                    <tr>
                                        <td colSpan={availableSizes.length + 6} className="px-4 py-8 text-center text-gray-500">
                                            No operations defined for this style yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {editingOp ? <Edit2 className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-green-400" />}
                                {editingOp ? 'Edit Operation' : 'Add New Operation'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest border-b border-blue-500/20 pb-2">Basic Definition</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Operation Name *</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.operation_name}
                                                onChange={e => setFormData({ ...formData, operation_name: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                                placeholder="e.g. SIDE SEAM JOINING"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-1">Sequence # *</label>
                                                <input
                                                    required
                                                    type="number"
                                                    value={formData.operation_sequence}
                                                    onChange={e => setFormData({ ...formData, operation_sequence: e.target.value })}
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-1">Part #</label>
                                                <input
                                                    type="number"
                                                    value={formData.cutting_part_no}
                                                    onChange={e => setFormData({ ...formData, cutting_part_no: e.target.value })}
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                                    placeholder="Optional"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-1">Machine Type</label>
                                                <input
                                                    type="text"
                                                    value={formData.machine_type}
                                                    onChange={e => setFormData({ ...formData, machine_type: e.target.value })}
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                                    placeholder="e.g. SNLS"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-1">SAM *</label>
                                                <input
                                                    required
                                                    type="number"
                                                    step="0.001"
                                                    value={formData.sam}
                                                    onChange={e => setFormData({ ...formData, sam: e.target.value })}
                                                    className="w-full bg-gray-900 border border-green-500/20 rounded-lg px-4 py-2 text-green-400 font-mono focus:outline-none focus:border-green-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest border-b border-orange-500/20 pb-2">Size Counts / Units</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        {availableSizes.map(s => (
                                            <div key={s}>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{s}</label>
                                                <input
                                                    type="number"
                                                    value={formData.sizes[s]}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        sizes: { ...formData.sizes, [s]: e.target.value }
                                                    })}
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 text-center font-mono"
                                                    placeholder="--"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg flex gap-3">
                                        <Info className="w-5 h-5 text-orange-400 shrink-0" />
                                        <p className="text-[11px] text-orange-200/70">Enter numeric counts or units for each size. Leave blank if not applicable.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-6 flex justify-end gap-3 border-t border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingOp ? 'Update Operation' : 'Create Operation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
