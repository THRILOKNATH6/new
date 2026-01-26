import { useState, useEffect } from 'react';
import { Target, Plus, Save, AlertCircle, CheckCircle, Activity, Settings2, Edit2, Trash2, User, Clock, X, Info } from 'lucide-react';
import * as ieAPI from '../api/ieService';
import { useAuth } from '@/context/AuthContext';

export default function IEOperationsPage() {
    const { user } = useAuth();
    const [sizeCategories, setSizeCategories] = useState([]);
    const [styles, setStyles] = useState([]);
    const [selectedStyle, setSelectedStyle] = useState('');


    const [existingOps, setExistingOps] = useState([]);
    const [loadingOps, setLoadingOps] = useState(false);
    const [isEditing, setIsEditing] = useState(null); // stores { oldSequence }

    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [errors, setErrors] = useState({});

    // Operation rows state - only allowed fields
    const [operationRows, setOperationRows] = useState([
        {
            id: Date.now(),
            operation_name: '',
            operation_sequence: '',
            cutting_part_no: '',
            machine_type: '',
            sam: ''
        }
    ]);

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



    const fetchExistingOps = async () => {
        if (!selectedStyle) {
            setErrors({ style: 'Please select a style first' });
            return;
        }
        setLoadingOps(true);
        try {
            const data = await ieAPI.getOperationsByStyle(selectedStyle);
            setExistingOps(data || []);
            setErrors({});
        } catch (e) {
            console.error('Failed to fetch ops', e);
            setErrors({ general: 'Failed to fetch existing operations' });
        } finally {
            setLoadingOps(false);
        }
    };

    const addOperationRow = () => {
        const newRow = {
            id: Date.now(),
            operation_name: '',
            operation_sequence: '',
            cutting_part_no: '',
            machine_type: '',
            sam: ''
        };
        setOperationRows([...operationRows, newRow]);
        setErrors({});
    };



    const handleEdit = (op) => {
        setIsEditing({ oldSequence: op.operation_sequence });
        setOperationRows([{
            id: Date.now(),
            operation_name: op.operation_name,
            operation_sequence: op.operation_sequence,
            cutting_part_no: op.cutting_part_no || '',
            machine_type: op.machine_type || '',
            sam: op.sam
        }]);
        setSuccess('');
        setErrors({});
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (sequence) => {
        if (!window.confirm(`Are you sure you want to delete sequence ${sequence} across all categories?`)) return;
        try {
            await ieAPI.deleteOperationByStyle(selectedStyle, sequence);
            setSuccess(`Deleted sequence ${sequence}`);
            fetchExistingOps();
        } catch (e) {
            setErrors({ general: 'Delete failed' });
        }
    };

    const cancelEdit = () => {
        setIsEditing(null);
        setOperationRows([{
            id: Date.now(),
            operation_name: '',
            operation_sequence: '',
            cutting_part_no: '',
            machine_type: '',
            sam: ''
        }]);
        setErrors({});
    };

    const updateOperationRow = (id, field, value) => {
        setOperationRows(operationRows.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
        // Clear error for this field when user starts typing
        if (errors[`${id}_${field}`]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[`${id}_${field}`];
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Validate context fields
        if (!selectedStyle) {
            newErrors.style = 'Style is required';
        }

        const sequences = new Set();
        const duplicateSeqs = new Set();

        // Validate operation rows
        operationRows.forEach((row) => {
            if (!row.operation_name.trim()) {
                newErrors[`${row.id}_operation_name`] = 'Required';
            }
            if (!row.operation_sequence || isNaN(row.operation_sequence)) {
                newErrors[`${row.id}_operation_sequence`] = 'Numeric required';
            } else {
                const seq = parseInt(row.operation_sequence);
                if (sequences.has(seq)) {
                    duplicateSeqs.add(seq);
                }
                sequences.add(seq);
            }
            if (!row.sam || isNaN(row.sam)) {
                newErrors[`${row.id}_sam`] = 'Numeric required';
            }
        });

        // Mark duplicate sequence errors
        if (duplicateSeqs.size > 0 && !isEditing) {
            operationRows.forEach(row => {
                const seq = parseInt(row.operation_sequence);
                if (duplicateSeqs.has(seq)) {
                    newErrors[`${row.id}_operation_sequence`] = 'Duplicate';
                }
            });
            newErrors.general = 'Duplicate sequence numbers found in the form.';
        }

        // Check if at least one row has data
        const hasData = operationRows.some(row =>
            row.operation_name.trim() ||
            row.operation_sequence ||
            row.machine_type ||
            row.sam
        );

        if (!hasData) {
            newErrors.general = 'Please enter at least one operation';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }

        setSaving(true);
        setSuccess('');

        try {
            if (isEditing) {
                // Update mode
                const op = operationRows[0];
                const payload = {
                    operation_name: op.operation_name.trim(),
                    operation_sequence: parseInt(op.operation_sequence),
                    cutting_part_no: op.cutting_part_no ? parseInt(op.cutting_part_no) : null,
                    machine_type: op.machine_type.trim(),
                    sam: parseFloat(op.sam)
                };

                await ieAPI.updateOperationByStyle(selectedStyle, isEditing.oldSequence, payload);
                setSuccess(`Successfully updated operation ${payload.operation_name}`);
                setIsEditing(null);
                fetchExistingOps();
            } else {
                // Insert mode
                const validRows = operationRows.filter(row =>
                    row.operation_name.trim() &&
                    row.operation_sequence &&
                    row.sam
                );

                if (validRows.length === 0) {
                    setErrors({ general: 'Please enter at least one complete operation' });
                    setSaving(false);
                    return;
                }

                const operations = validRows.map(row => ({
                    style_id: selectedStyle,
                    operation_name: row.operation_name.trim(),
                    operation_sequence: parseInt(row.operation_sequence),
                    cutting_part_no: row.cutting_part_no ? parseInt(row.cutting_part_no) : null,
                    machine_type: row.machine_type.trim(),
                    sam: parseFloat(row.sam)
                }));

                await ieAPI.createBatchOperationsForStyle(selectedStyle, operations, user);
                setSuccess(`Successfully created ${operations.length} operations for ${selectedStyle}.`);
                fetchExistingOps();
            }

            // Reset form
            setOperationRows([{
                id: Date.now(),
                operation_name: '',
                operation_sequence: '',
                cutting_part_no: '',
                machine_type: '',
                sam: ''
            }]);
            setErrors({});
            setTimeout(() => setSuccess(''), 3000);

        } catch (err) {
            console.error('Save failed:', err);
            setErrors({ general: err.response?.data?.message || 'Save failed' });
        } finally {
            setSaving(false);
        }
    };



    return (
        <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="w-8 h-8 text-blue-400" />
                        Operation Master Management
                    </h1>
                    <p className="text-gray-400">Manage operations for a style. Bulk insert or single edit supported.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">IE Manager Access</span>
                </div>
            </div>

            {/* Main Form */}
            <div className={`glass-card p-6 space-y-6 transition-all duration-300 ${isEditing ? 'border-amber-500/30 ring-1 ring-amber-500/20' : ''}`}>
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white flex items-center gap-3">
                        {isEditing ? (
                            <><Edit2 className="w-5 h-5 text-amber-400" /> Update Operation</>
                        ) : (
                            <><Plus className="w-5 h-5 text-blue-400" /> Add New Operations</>
                        )}
                    </h2>
                    {isEditing && (
                        <button onClick={cancelEdit} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold uppercase px-2 py-1 rounded bg-amber-500/10">
                            <X className="w-3 h-3" /> Cancel Edit
                        </button>
                    )}
                </div>

                {/* Context Section - Style Only */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase">Style *</label>
                        <select
                            disabled={isEditing}
                            value={selectedStyle}
                            onChange={(e) => {
                                setSelectedStyle(e.target.value);
                                setExistingOps([]);
                            }}
                            className={`w-full bg-gray-900/50 border ${errors.style ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all`}
                        >
                            <option value="">-- Choose Style --</option>
                            {styles.map(s => (
                                <option key={s.style_id} value={s.style_id}>{s.style_name} ({s.style_id})</option>
                            ))}
                        </select>
                        {errors.style && <p className="text-red-400 text-xs">{errors.style}</p>}
                    </div>
                    <div>
                        <button
                            type="button"
                            onClick={fetchExistingOps}
                            disabled={!selectedStyle || loadingOps}
                            className="w-full md:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold border border-slate-700 transition-all flex items-center justify-center gap-2"
                        >
                            {loadingOps ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Target className="w-4 h-4" />}
                            View Existing Operations
                        </button>
                    </div>
                </div>

                {/* Success/Error Messages */}
                {success && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <p className="text-green-400 text-sm font-medium">{success}</p>
                    </div>
                )}

                {errors.general && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-red-400 text-sm font-medium">{errors.general}</p>
                    </div>
                )}

                {/* Operation Entry Rows */}
                <div className="space-y-4">
                    {/* Table Header */}
                    <div className="bg-gray-800/50 rounded-t-lg border border-gray-700 border-b-0 hidden md:block">
                        <div className="grid grid-cols-5 gap-4 px-4 py-3">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Operation Name *</div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sequence *</div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Part</div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Machine Type</div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">SAM *</div>
                        </div>
                    </div>

                    {/* Operation Rows */}
                    <div className="border border-gray-700 border-t-0 rounded-b-lg divide-y divide-gray-700">
                        {operationRows.map((row) => (
                            <div key={row.id} className="p-4 hover:bg-white/5 transition-colors">
                                <div className="grid grid-cols-5 gap-4">
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold md:hidden">Operation Name</label>
                                        <input
                                            type="text"
                                            value={row.operation_name}
                                            onChange={(e) => updateOperationRow(row.id, 'operation_name', e.target.value)}
                                            className={`w-full bg-gray-900 border ${errors[`${row.id}_operation_name`] ? 'border-red-500' : 'border-gray-600'} rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500`}
                                            placeholder="e.g. SIDE SEAM"
                                        />
                                        {errors[`${row.id}_operation_name`] && (
                                            <p className="text-red-400 text-xs mt-1">{errors[`${row.id}_operation_name`]}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold md:hidden">Sequence</label>
                                        <input
                                            type="number"
                                            value={row.operation_sequence}
                                            onChange={(e) => updateOperationRow(row.id, 'operation_sequence', e.target.value)}
                                            className={`w-full bg-gray-900 border ${errors[`${row.id}_operation_sequence`] ? 'border-red-500' : 'border-gray-600'} rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500`}
                                            placeholder="1"
                                        />
                                        {errors[`${row.id}_operation_sequence`] && (
                                            <p className="text-red-400 text-xs mt-1">{errors[`${row.id}_operation_sequence`]}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold md:hidden">Part No</label>
                                        <input
                                            type="number"
                                            value={row.cutting_part_no}
                                            onChange={(e) => updateOperationRow(row.id, 'cutting_part_no', e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                            placeholder="Optional"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold md:hidden">Machine</label>
                                        <input
                                            type="text"
                                            value={row.machine_type}
                                            onChange={(e) => updateOperationRow(row.id, 'machine_type', e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                            placeholder="e.g. SNLS"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold md:hidden">SAM</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            value={row.sam}
                                            onChange={(e) => updateOperationRow(row.id, 'sam', e.target.value)}
                                            className={`w-full bg-gray-900 border ${errors[`${row.id}_sam`] ? 'border-red-500' : 'border-green-500/20'} rounded-lg px-3 py-2 text-green-400 text-sm font-mono focus:outline-none focus:border-green-500`}
                                            placeholder="0.000"
                                        />
                                        {errors[`${row.id}_sam`] && (
                                            <p className="text-red-400 text-xs mt-1">{errors[`${row.id}_sam`]}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {operationRows.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                No operation rows added yet. Click "Add Operation" to start.
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-4 pt-6 border-t border-gray-700">
                    {!isEditing && (
                        <button
                            type="button"
                            onClick={addOperationRow}
                            className="px-6 py-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg font-bold transition-all border border-blue-500/20 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" /> Add Row
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className={`ml-auto px-10 py-3 ${isEditing ? 'bg-amber-600 hover:bg-amber-500' : 'bg-green-600 hover:bg-green-500'} disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg font-bold transition-all flex items-center gap-3 shadow-lg`}
                    >
                        {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : (isEditing ? <Save className="w-5 h-5" /> : <Save className="w-5 h-5" />)}
                        {isEditing ? 'Update Operation' : 'Save Operations'}
                    </button>
                </div>
            </div>

            {/* Existing Operations Table */}
            {existingOps.length > 0 && (
                <div className="glass-card overflow-hidden">
                    <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                        <h3 className="text-white font-bold flex items-center gap-2 uppercase tracking-widest text-xs">
                            <Activity className="w-4 h-4 text-blue-400" />
                            Current Operations for {selectedStyle}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                            {existingOps.length} STAGES
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/20">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Seq</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Operation Name</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Part</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Machine</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">SAM</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {existingOps.map((op) => (
                                    <tr key={op.operation_sequence} className="group hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-sm font-bold text-blue-400 font-mono">{op.operation_sequence}</td>
                                        <td className="px-6 py-4 text-sm text-gray-300 font-semibold">{op.operation_name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-400">{op.cutting_part_no || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-400">
                                            <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-[11px] font-bold">{op.machine_type || 'MANUAL'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-green-400 font-mono font-bold">{op.sam}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleEdit(op)} className="p-2 hover:bg-amber-500/20 text-amber-500/50 hover:text-amber-500 rounded-lg transition-all" title="Edit Operation">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(op.operation_sequence)} className="p-2 hover:bg-red-500/20 text-red-500/50 hover:text-red-500 rounded-lg transition-all" title="Delete Operation">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
