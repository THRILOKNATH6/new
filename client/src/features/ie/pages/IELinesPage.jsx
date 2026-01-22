import { useState, useEffect } from 'react';
import { Activity, Plus, Trash2, Edit2, X, Settings2, Users, Cpu, UserPlus, UserMinus, ArrowRight, Save, Clock, Target as OperationIcon, ChevronRight, Award, Box, Tag, Layers } from 'lucide-react';
import * as ieAPI from '../api/ieService';

export default function IELinesPage() {
    const [lines, setLines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingLine, setEditingLine] = useState(null);

    // Resource Pool & Masters
    const [staffPool, setStaffPool] = useState([]);
    const [masters, setMasters] = useState({ operations: [], shifts: [], styles: [] });

    // Assignment & Drill-down
    const [staffPanelOpen, setStaffPanelOpen] = useState(false);
    const [activeLineItem, setActiveLineItem] = useState(null);
    const [lineStaff, setLineStaff] = useState([]);
    const [unassignedStaff, setUnassignedStaff] = useState([]);
    const [selectedUnassigned, setSelectedUnassigned] = useState([]);
    const [workEditModal, setWorkEditModal] = useState(null);
    const [lineOperations, setLineOperations] = useState([]);
    const [drillDownModal, setDrillDownModal] = useState(null);
    const [opsLoading, setOpsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        line_no: '',
        line_name: '',
        status: 'ACTIVE',
        running_style_id: '',
        line_supervisor_id: '',
        line_ie_id: '',
        line_qc_id: '',
        line_feeding_helper_id: '',
        line_mechanic_id: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [linesData, pool, masterData] = await Promise.all([
                ieAPI.getLines(),
                ieAPI.getStaffPool(),
                ieAPI.getIEMasters()
            ]);
            setLines(linesData || []);
            setStaffPool(pool || []);
            setMasters(masterData);
        } catch (e) { console.error('Data load failed', e); }
        finally { setLoading(false); }
    };

    const loadStaffData = async (lineNo) => {
        try {
            const [lineData, unassignedData] = await Promise.all([
                ieAPI.getLineStaff(lineNo),
                ieAPI.getUnassignedStaff()
            ]);
            setLineStaff(lineData || []);
            setUnassignedStaff(unassignedData || []);
        } catch (e) { console.error(e); }
    };

    const handleOpenStaffPanel = (l) => {
        setActiveLineItem(l);
        loadStaffData(l.lineInfo.line_no);
        setStaffPanelOpen(true);
    };

    const handleOpenDrillDown = async (l) => {
        try {
            const data = await ieAPI.getLineManpower(l.lineInfo.line_no);
            setDrillDownModal(data);
            setActiveLineItem(l); // Ensure context is preserved for edits
        } catch (e) { alert('Failed to load detail'); }
    };

    const triggerWorkEdit = async (emp, lineNo) => {
        setOpsLoading(true);
        setWorkEditModal({ ...emp, operationId: emp.assigned_operation_id });
        try {
            const ops = await ieAPI.getLineOperations(lineNo);
            setLineOperations(ops || []);
        } catch (e) {
            console.error('Ops fetch failed', e);
            setLineOperations([]);
        } finally {
            setOpsLoading(false);
        }
    };

    const handleAssign = async () => {
        if (selectedUnassigned.length === 0) return;
        try {
            await ieAPI.assignStaff(activeLineItem.lineInfo.line_no, selectedUnassigned);
            setSelectedUnassigned([]);
            loadStaffData(activeLineItem.lineInfo.line_no);
            loadData();
        } catch (e) { alert('Assignment failed'); }
    };

    const handleUnassign = async (empId) => {
        try {
            await ieAPI.unassignStaff([empId]);
            if (activeLineItem) loadStaffData(activeLineItem.lineInfo.line_no);
            loadData();
            if (drillDownModal) {
                const updated = await ieAPI.getLineManpower(drillDownModal.line_no);
                setDrillDownModal(updated);
            }
        } catch (e) { alert('Unassignment failed'); }
    };

    const handleDesignateRole = async (empId, role) => {
        try {
            await ieAPI.designateRole(activeLineItem.lineInfo.line_no, role, empId);
            const updatedLines = await ieAPI.getLines();
            setLines(updatedLines);
            const current = updatedLines.find(l => l.lineInfo.line_no === activeLineItem.lineInfo.line_no);
            if (current) setActiveLineItem(current);
        } catch (e) { alert('Role designation failed'); }
    };

    const handleUpdateWork = async (e) => {
        e.preventDefault();
        try {
            await ieAPI.updateWorkDetails(workEditModal.emp_id, {
                operationId: workEditModal.operationId,
                shiftNo: workEditModal.shiftNo,
                workStage: workEditModal.workStage,
                dailyTarget: workEditModal.dailyTarget
            });
            setWorkEditModal(null);
            if (activeLineItem) loadStaffData(activeLineItem.lineInfo.line_no);
            if (drillDownModal) {
                const updated = await ieAPI.getLineManpower(drillDownModal.line_no);
                setDrillDownModal(updated);
            }
            loadData();
        } catch (e) { alert('Update failed'); }
    };

    const handleEditLine = (l) => {
        setEditingLine(l.lineInfo.line_no);
        setFormData({
            line_no: l.lineInfo.line_no,
            line_name: l.lineInfo.line_name,
            status: l.lineInfo.status,
            running_style_id: l.runningStyle.style_id || '',
            line_supervisor_id: l.responsiblePersons.supervisor?.id || '',
            line_ie_id: l.responsiblePersons.ie?.id || '',
            line_qc_id: l.responsiblePersons.qc?.id || '',
            line_feeding_helper_id: l.responsiblePersons.feedingHelper?.id || '',
            line_mechanic_id: l.responsiblePersons.mechanic?.id || ''
        });
        setModalOpen(true);
    };

    const handleSubmitLine = async (e) => {
        e.preventDefault();
        try {
            if (editingLine) await ieAPI.updateLine(editingLine, formData);
            else await ieAPI.createLine(formData);
            loadData();
            setModalOpen(false);
            setEditingLine(null);
        } catch (e) { alert(e.response?.data?.message || 'Transaction failed'); }
    };

    const LineCard = ({ l }) => {
        const { lineInfo, runningStyle, responsiblePersons, manpowerSummary } = l;
        const prodCount = manpowerSummary.find(s => s.department_id === 1)?.count || 0;
        const ieCount = manpowerSummary.find(s => s.department_id === 4)?.count || 0;
        const otherCount = manpowerSummary.filter(s => ![1, 4].includes(s.department_id)).reduce((acc, curr) => acc + parseInt(curr.count), 0);

        return (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all flex flex-col overflow-hidden h-[420px] flex-shrink-0">
                {/* Header */}
                <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-100">
                            {lineInfo.line_no}
                        </div>
                        <div>
                            <h4 className="font-black text-gray-900 text-xs">{lineInfo.line_name}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${lineInfo.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <span className="text-[8px] font-black tracking-tighter text-gray-400 uppercase">{lineInfo.status}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => handleEditLine(l)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"><Edit2 size={14} /></button>
                </div>

                {/* Running Style */}
                <div className="p-5 bg-indigo-50/30 border-b border-gray-50">
                    <div className="flex items-center gap-2 mb-3">
                        <Tag size={10} className="text-indigo-600" />
                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Active Style</span>
                    </div>
                    {runningStyle.style_id ? (
                        <div className="space-y-1">
                            <h5 className="text-[11px] font-black text-gray-900 truncate">{runningStyle.style_name}</h5>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-[8px] font-bold bg-white text-gray-500 px-2 py-0.5 rounded-md border border-gray-100">{runningStyle.brand}</span>
                                <span className="text-[8px] font-bold bg-white text-gray-500 px-2 py-0.5 rounded-md border border-gray-100">{runningStyle.colour}</span>
                                <span className="text-[8px] font-bold bg-white text-gray-500 px-2 py-0.5 rounded-md border border-gray-100">{runningStyle.size_category}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-[10px] font-bold text-gray-300 italic">No Active Style</p>
                    )}
                </div>

                {/* Responsible Persons */}
                <div className="px-5 py-4 border-b border-gray-50 space-y-2 flex-grow overflow-y-auto no-scrollbar">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Award size={10} /> Resource Command
                    </div>
                    {[
                        { label: 'Supervisor', person: responsiblePersons.supervisor },
                        { label: 'IE', person: responsiblePersons.ie },
                        { label: 'QC', person: responsiblePersons.qc },
                        { label: 'Helper', person: responsiblePersons.feedingHelper },
                        { label: 'Mechanic', person: responsiblePersons.mechanic }
                    ].map(row => (
                        <div key={row.label} className="flex items-center justify-between py-0.5">
                            <span className="text-[10px] text-gray-400 font-bold">{row.label}</span>
                            <span className={`text-[10px] font-black truncate max-w-[140px] ${row.person ? 'text-gray-800' : 'text-gray-200'}`}>
                                {row.person?.name || 'Not Assigned'}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Manpower Summary */}
                <div onClick={() => handleOpenDrillDown(l)} className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors group">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Manpower Overview</span>
                        <ChevronRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-indigo-50 rounded-xl">
                            <div className="text-xs font-black text-indigo-600">{prodCount}</div>
                            <div className="text-[7px] font-bold text-indigo-400 uppercase">Prod</div>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-xl">
                            <div className="text-xs font-black text-gray-800">{ieCount}</div>
                            <div className="text-[7px] font-bold text-gray-400 uppercase">IE</div>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-xl">
                            <div className="text-xs font-black text-gray-400">{otherCount}</div>
                            <div className="text-[7px] font-bold text-gray-400 uppercase">Other</div>
                        </div>
                    </div>
                </div>

                <div className="p-5 pt-0">
                    <button onClick={() => handleOpenStaffPanel(l)} className="w-full bg-gray-950 hover:bg-indigo-600 text-white p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                        <Settings2 size={12} /> Manage floor staff
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 sm:p-10 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-indigo-600 rounded-[1.5rem] text-white shadow-xl shadow-indigo-100">
                        <Activity size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Production Floor</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Real-time Line & Resource Management</p>
                    </div>
                </div>
                <button
                    onClick={() => { setEditingLine(null); setFormData({ line_no: '', line_name: '', status: 'ACTIVE', running_style_id: '', line_supervisor_id: '', line_ie_id: '', line_qc_id: '', line_feeding_helper_id: '', line_mechanic_id: '' }); setModalOpen(true); }}
                    className="bg-gray-950 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-xl shadow-gray-200 active:scale-95"
                >
                    <Plus size={20} /> Initialize New Line
                </button>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {lines.map(l => <LineCard key={l.lineInfo.line_no} l={l} />)}
                </div>
            )}

            {/* Line Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                    <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{editingLine ? 'Update Line' : 'Setup Line'}</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest">Configuration & Resource Binding</p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X size={28} /></button>
                        </div>
                        <form onSubmit={handleSubmitLine} className="p-10 space-y-6 overflow-y-auto max-h-[70vh] no-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Line No</label>
                                    <input type="number" required disabled={!!editingLine} value={formData.line_no} onChange={e => setFormData({ ...formData, line_no: e.target.value })} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-indigo-500/20" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">System Status</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold outline-none">
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="IDLE">IDLE</option>
                                        <option value="STOPPED">STOPPED</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Display Name</label>
                                <input required value={formData.line_name} onChange={e => setFormData({ ...formData, line_name: e.target.value })} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold outline-none" placeholder="e.g. Line-05-PREMIUM" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Running Style</label>
                                <select value={formData.running_style_id} onChange={e => setFormData({ ...formData, running_style_id: e.target.value })} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold outline-none">
                                    <option value="">No Active Style</option>
                                    {masters.styles.map(s => <option key={s.style_id} value={s.style_id}>{s.style_name} ({s.brand})</option>)}
                                </select>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-gray-100">
                                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Award size={14} /> Responsible Persons
                                </div>
                                {[
                                    { id: 'line_supervisor_id', label: 'Line Supervisor' },
                                    { id: 'line_ie_id', label: 'Process IE' },
                                    { id: 'line_qc_id', label: 'QC Lead' },
                                    { id: 'line_feeding_helper_id', label: 'Feeding Helper' },
                                    { id: 'line_mechanic_id', label: 'Maintenance Mechanic' }
                                ].map(role => (
                                    <div key={role.id} className="space-y-1.5 px-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{role.label}</label>
                                        </div>
                                        <select
                                            value={formData[role.id]}
                                            onChange={e => setFormData({ ...formData, [role.id]: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-100 p-3 rounded-2xl text-xs font-bold outline-none focus:bg-white transition-colors"
                                        >
                                            <option value="">Not Assigned</option>
                                            {staffPool.map(s => <option key={s.emp_id} value={s.emp_id}>{s.name} ({s.designation_name})</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95">
                                {editingLine ? 'Save Dynamic Configuration' : 'Establish Production Line'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Drill-Down */}
            {drillDownModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-end">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setDrillDownModal(null)} />
                    <div className="w-full max-w-2xl h-screen bg-white shadow-2xl relative flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-10 bg-gray-950 text-white flex justify-between items-center">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-xl shadow-indigo-500/20">{drillDownModal.line_no}</div>
                                <div>
                                    <h3 className="text-2xl font-black">Personnel Analytics</h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Operational Audit: {drillDownModal.line_name}</p>
                                </div>
                            </div>
                            <button onClick={() => setDrillDownModal(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X size={32} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar bg-gray-50/50">
                            {drillDownModal.summary.map(dept => (
                                <section key={dept.department_id}>
                                    <div className="flex items-center justify-between mb-6">
                                        <h5 className="flex items-center gap-3 text-xs font-black text-indigo-600 uppercase tracking-widest">
                                            <div className="h-[2px] w-8 bg-indigo-600 rounded-full" /> {dept.department_name}
                                        </h5>
                                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-black">{dept.count} Active</span>
                                    </div>
                                    <div className="grid gap-4">
                                        {drillDownModal.employees.filter(e => e.department_id === dept.department_id).map(e => (
                                            <div key={e.emp_id} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-gray-100 hover:border-indigo-200 transition-all group shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-[10px] font-black text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                        {e.emp_id.slice(-3)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm">{e.name}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">{e.designation_name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    {[1, 4].includes(e.department_id) && e.operation_name && (
                                                        <div className="text-right">
                                                            <div className="flex items-center gap-1.5 justify-end">
                                                                <OperationIcon size={12} className="text-indigo-600" />
                                                                <p className="text-[10px] font-black text-gray-900 uppercase tracking-tighter">{e.operation_name}</p>
                                                            </div>
                                                            <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{e.work_stage || 'Stage -'}</p>
                                                        </div>
                                                    )}
                                                    <div className="flex gap-2">
                                                        {[1, 4].includes(e.department_id) && (
                                                            <button onClick={() => triggerWorkEdit(e, drillDownModal.line_no)} className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all"><Edit2 size={16} /></button>
                                                        )}
                                                        <button onClick={() => handleUnassign(e.emp_id)} className="p-3 bg-rose-50 text-rose-400 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><UserMinus size={16} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Assignment */}
            {staffPanelOpen && (
                <div className="fixed inset-0 z-[120] overflow-hidden">
                    <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm" onClick={() => setStaffPanelOpen(false)} />
                    <div className="absolute inset-y-0 right-0 max-w-3xl w-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-400">
                        <div className="h-32 bg-gray-950 flex items-center justify-between px-10 text-white">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white"><Users size={32} /></div>
                                <div>
                                    <h3 className="text-2xl font-black">Line {activeLineItem?.lineInfo.line_no} Resources</h3>
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Dynamic Allocation & Role Binding</p>
                                </div>
                            </div>
                            <button onClick={() => setStaffPanelOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X size={32} /></button>
                        </div>
                        <div className="flex-1 flex overflow-hidden divide-x divide-gray-100">
                            {/* Pool */}
                            <div className="w-1/2 flex flex-col bg-gray-50/30">
                                <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available Resource Pool</span>
                                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-xl text-[10px] font-black">{unassignedStaff.length}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
                                    {unassignedStaff.map(s => (
                                        <label key={s.emp_id} className={`flex items-center justify-between p-5 rounded-3xl border transition-all cursor-pointer shadow-sm ${selectedUnassigned.includes(s.emp_id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100'}`}>
                                            <div className="flex items-center gap-4 min-w-0">
                                                <input type="checkbox" className="hidden" onChange={(e) => {
                                                    if (e.target.checked) setSelectedUnassigned([...selectedUnassigned, s.emp_id]);
                                                    else setSelectedUnassigned(selectedUnassigned.filter(id => id !== s.emp_id));
                                                }} />
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${selectedUnassigned.includes(s.emp_id) ? 'bg-white/20' : 'bg-gray-100 text-gray-400'}`}>{s.name.charAt(0)}</div>
                                                <div className="min-w-0">
                                                    <p className={`font-black text-sm truncate ${selectedUnassigned.includes(s.emp_id) ? 'text-white' : 'text-gray-900'}`}>{s.name}</p>
                                                    <p className={`text-[9px] font-bold uppercase truncate ${selectedUnassigned.includes(s.emp_id) ? 'text-indigo-200' : 'text-gray-400'}`}>{s.department_name}</p>
                                                </div>
                                            </div>
                                            {selectedUnassigned.includes(s.emp_id) && <div className="p-1 bg-white rounded-full"><Plus size={12} className="text-indigo-600" /></div>}
                                        </label>
                                    ))}
                                </div>
                                <div className="p-8 bg-white border-t border-gray-100">
                                    <button disabled={selectedUnassigned.length === 0} onClick={handleAssign} className="w-full bg-indigo-600 disabled:bg-gray-100 text-white py-5 rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-3 shadow-xl transition-all hover:translate-y-[-2px] active:scale-95">
                                        Bind to Line Command <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                            {/* Linked */}
                            <div className="w-1/2 flex flex-col bg-white">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Operational Core</span>
                                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-xl text-[10px] font-black">{lineStaff.length} Nodes</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                                    {lineStaff.map(s => {
                                        const rps = activeLineItem?.responsiblePersons || {};
                                        const isCmd = Object.values(rps).some(p => p?.id === s.emp_id);
                                        return (
                                            <div key={s.emp_id} className="p-5 rounded-3xl border border-gray-50 bg-white shadow-sm flex flex-col gap-4 relative overflow-hidden group">
                                                {isCmd && <div className="absolute top-0 right-0 bg-indigo-600 text-white px-3 py-1 text-[8px] font-black uppercase rounded-bl-2xl">Command</div>}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 bg-gray-900 rounded-2xl text-white font-black text-xs flex items-center justify-center shrink-0 shadow-lg">{s.emp_id.slice(-3)}</div>
                                                        <div className="min-w-0">
                                                            <p className="font-black text-gray-900 text-sm truncate">{s.name}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase truncate mt-0.5">{s.designation_name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="relative group/role">
                                                            <button className={`p-2.5 rounded-2xl transition-all ${isCmd ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400 hover:text-indigo-600'}`}><Award size={18} /></button>
                                                            <div className="absolute right-0 top-full mt-2 hidden group-hover/role:block z-[200] bg-white shadow-2xl border border-gray-100 rounded-[2rem] p-4 w-56 animate-in fade-in zoom-in-95 duration-200">
                                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-2">Designate Command</p>
                                                                {[
                                                                    { key: 'line_supervisor_id', label: 'Supervisor' },
                                                                    { key: 'line_ie_id', label: 'IE Manager' },
                                                                    { key: 'line_qc_id', label: 'QC Inspector' },
                                                                    { key: 'line_feeding_helper_id', label: 'Line Helper' },
                                                                    { key: 'line_mechanic_id', label: 'Mechanic' }
                                                                ].map(role => (
                                                                    <button key={role.key} onClick={() => handleDesignateRole(s.emp_id, role.key)} className="w-full text-left px-4 py-3 text-[11px] font-black text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl transition-all mb-1">Set as {role.label}</button>
                                                                ))}
                                                                <div className="h-[1px] bg-gray-50 my-2" />
                                                                <button onClick={() => handleDesignateRole(null, 'line_supervisor_id')} className="w-full text-left px-4 py-3 text-[11px] font-black text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">Clear Commands</button>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => triggerWorkEdit(s, activeLineItem.lineInfo.line_no)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-2xl transition-all"><Edit2 size={16} /></button>
                                                        <button onClick={() => handleUnassign(s.emp_id)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-rose-500 rounded-2xl transition-all"><UserMinus size={16} /></button>
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 rounded-2xl p-3 flex items-center gap-3">
                                                    <div className="p-1.5 bg-white rounded-lg shadow-sm"><OperationIcon size={12} className="text-indigo-600" /></div>
                                                    <span className="text-[10px] font-black text-gray-600 truncate">{s.operation_name || 'NO TASK BOUND'}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Work Modal */}
            {workEditModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-md" onClick={() => setWorkEditModal(null)} />
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md relative overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-10 border-b border-gray-50 bg-indigo-600 text-white">
                            <h3 className="text-2xl font-black tracking-tight">Node Metrics</h3>
                            <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest mt-1">{workEditModal.name} • Internal Node: {workEditModal.emp_id}</p>
                        </div>
                        <form onSubmit={handleUpdateWork} className="p-10 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Primary Operation</label>
                                <div className="relative">
                                    <select
                                        disabled={opsLoading || lineOperations.length === 0}
                                        value={workEditModal.operationId || ''}
                                        onChange={e => setWorkEditModal({ ...workEditModal, operationId: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 p-5 rounded-3xl text-sm font-black outline-none focus:ring-2 ring-indigo-500/10 appearance-none disabled:bg-gray-100 disabled:opacity-50"
                                    >
                                        <option value="">{opsLoading ? 'Resolving Source...' : lineOperations.length === 0 ? 'No Style Operations Found' : 'Select Operation'}</option>
                                        {lineOperations.map(o => (
                                            <option key={o.operation_id} value={o.operation_id}>
                                                {o.operation_sequence}. {o.operation_name} (SAM: {o.sam})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        {opsLoading ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Layers size={18} />}
                                    </div>
                                </div>
                                {lineOperations.length === 0 && !opsLoading && (
                                    <p className="text-[9px] text-rose-500 font-bold px-1 animate-pulse">Assign an active style to this line to unlock operations.</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Target</label>
                                    <input type="number" value={workEditModal.dailyTarget || ''} onChange={e => setWorkEditModal({ ...workEditModal, dailyTarget: e.target.value })} className="w-full bg-gray-50 border border-gray-100 p-5 rounded-3xl text-sm font-black outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Stage</label>
                                    <input type="text" value={workEditModal.workStage || ''} onChange={e => setWorkEditModal({ ...workEditModal, workStage: e.target.value })} className="w-full bg-gray-50 border border-gray-100 p-5 rounded-3xl text-sm font-black outline-none" placeholder="e.g. Front Assembly" />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-gray-950 text-white py-5 rounded-[2rem] font-black text-sm hover:bg-indigo-600 transition-all shadow-xl active:scale-95">
                                Commit Operational Change
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
