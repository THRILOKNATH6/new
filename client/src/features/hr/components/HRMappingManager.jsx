import { useState, useEffect } from 'react';
import { getDepartments, getDesignations, getMappings, addMapping, removeMapping } from '../api/hrService';
import { ShieldCheck, Info, Loader2, Check } from 'lucide-react';

export default function HRMappingManager() {
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [mappings, setMappings] = useState([]);
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [deptRes, desigRes, mappingRes] = await Promise.all([
                getDepartments(),
                getDesignations(),
                getMappings()
            ]);

            const deptData = deptRes.data || deptRes;
            const desigData = desigRes.data || desigRes;
            const mappingData = mappingRes.data || mappingRes;

            setDepartments(Array.isArray(deptData) ? deptData : []);
            setDesignations(Array.isArray(desigData) ? desigData : []);
            setMappings(Array.isArray(mappingData) ? mappingData : []);

            if (Array.isArray(deptData) && deptData.length > 0) {
                setSelectedDeptId(deptData[0].department_id);
            }
        } catch (err) {
            console.error('Failed to load mapping data:', err);
            setError('Failed to synchronize governance data. Please check connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleMapping = async (desigId, isCurrentlyAllowed) => {
        if (!selectedDeptId || actionLoading) return;

        try {
            setActionLoading(desigId);
            if (isCurrentlyAllowed) {
                await removeMapping(selectedDeptId, desigId);
            } else {
                await addMapping({ departmentId: selectedDeptId, designationId: desigId });
            }

            // Refresh mappings
            const mappingRes = await getMappings();
            const mappingData = mappingRes.data || mappingRes;
            setMappings(Array.isArray(mappingData) ? mappingData : []);
        } catch (err) {
            console.error('Mapping update failed:', err);
        } finally {
            setActionLoading(null);
        }
    };

    useEffect(() => {
        console.log('Mappings:', mappings);
    }, [mappings]);

    const currentDeptMapping = Array.isArray(mappings)
        ? mappings.find(m => m.department_id === parseInt(selectedDeptId))
        : null;

    const allowedDesignationIds = (currentDeptMapping?.allowed_designations && Array.isArray(currentDeptMapping.allowed_designations))
        ? currentDeptMapping.allowed_designations
            .map(d => d?.designation_id)
            .filter(id => id !== null && id !== undefined)
        : [];

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
                    <X size={32} />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Synchronicity Failure</h3>
                <p className="text-[11px] text-slate-500 font-bold max-w-xs">{error}</p>
                <button onClick={loadData} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Retry Sync</button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                        <ShieldCheck className="text-blue-600" size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Designation Governance</h3>
                        <p className="text-[11px] text-slate-500 font-bold mt-1">
                            Control which designations are authorized under each department. This enforces strict selection rules during employee management.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Department Selection */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Department</label>
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        {departments.map(dept => (
                            <button
                                key={dept.department_id}
                                onClick={() => setSelectedDeptId(dept.department_id)}
                                className={`w-full text-left px-5 py-4 text-xs font-black transition-all border-b border-slate-50 last:border-0
                                    ${parseInt(selectedDeptId) === dept.department_id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                            >
                                {dept.department_name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Designation Mapping */}
                <div className="lg:col-span-2 space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Allowed Designations</label>
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase">
                            {allowedDesignationIds.length} Selected
                        </span>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                        {selectedDeptId ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {designations.map(desig => {
                                    const isAllowed = allowedDesignationIds.includes(desig.designation_id);
                                    const isLoading = actionLoading === desig.designation_id;

                                    return (
                                        <button
                                            key={desig.designation_id}
                                            disabled={isLoading}
                                            onClick={() => handleToggleMapping(desig.designation_id, isAllowed)}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left
                                                ${isAllowed
                                                    ? 'bg-blue-50 border-blue-200 text-blue-800 ring-2 ring-blue-500/10'
                                                    : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[11px] font-black uppercase tracking-tight">{desig.designation_name}</span>
                                                <span className="text-[9px] font-bold opacity-60 uppercase tracking-wider">Level: {desig.designation_level}</span>
                                            </div>
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all
                                                ${isAllowed ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                                {isLoading ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : isAllowed ? (
                                                    <Check size={14} strokeWidth={3} />
                                                ) : null}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-10 text-center space-y-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                    <Info size={32} />
                                </div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Select a department to manage designations</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                        <Info className="text-amber-600 shrink-0" size={16} />
                        <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                            Changes take effect immediately. New employees in this department will only be restricted to the selected designations. Existing employees will be flagged if they violate these rules.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
