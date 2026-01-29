import { useState, useEffect } from 'react';
import * as hrAPI from '../api/hrService';
import { Plus, Search, Edit2, Filter, AlertTriangle } from 'lucide-react';
import EmployeeForm from '../components/EmployeeForm';

export default function EmployeeList() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        setLoading(true);
        try {
            const result = await hrAPI.getEmployees();
            setEmployees(result.data || []);
        } catch (err) {
            console.error("Failed to load employees");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (emp) => {
        setSelectedEmp(emp);
        setShowForm(true);
    };

    const handleSuccess = () => {
        setShowForm(false);
        setSelectedEmp(null);
        loadEmployees();
    };

    const filteredEmployees = employees.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.emp_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="op-card !p-0 overflow-hidden">
            {/* Toolbar */}
            <div className="p-2 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h2 className="text-[13px] font-black uppercase text-slate-800 tracking-tight">Systems Personnel Registry</h2>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={12} />
                        <input
                            type="text"
                            placeholder="Filter ID/Name..."
                            className="pl-7 pr-3 py-1 bg-white border border-slate-300 rounded text-[11px] text-slate-900 focus:border-blue-500 outline-none w-48"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <button
                    onClick={() => { setSelectedEmp(null); setShowForm(true); }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-white rounded text-[11px] font-bold hover:bg-black transition-none uppercase tracking-wider"
                >
                    <Plus size={12} />
                    New Entry
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="op-table">
                    <thead>
                        <tr>
                            <th className="w-24">REF ID</th>
                            <th>LEGAL NAME</th>
                            <th>DESIGNATION</th>
                            <th>DEPT UNIT</th>
                            <th>JOIN DATE</th>
                            <th className="text-center">STATUS</th>
                            <th className="text-right">OPS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan="7" className="px-3 py-4 text-center text-slate-400 font-bold italic">Syncing local records...</td></tr>
                        )}
                        {!loading && filteredEmployees.length === 0 && (
                            <tr><td colSpan="7" className="px-3 py-4 text-center text-slate-400">Empty set.</td></tr>
                        )}
                        {filteredEmployees.map((emp) => (
                            <tr key={emp.emp_id}>
                                <td className="font-mono font-bold text-blue-600 tracking-tight">{emp.emp_id}</td>
                                <td className="text-slate-800">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold">{emp.name}</span>
                                        {emp.has_mapping_conflict && (
                                            <div className="group relative">
                                                <AlertTriangle size={14} className="text-amber-500 cursor-help" />
                                                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block z-[100] w-48 p-2 bg-slate-800 text-white text-[9px] font-bold rounded-lg shadow-xl uppercase tracking-tighter">
                                                    Designation Violation: This role is not authorized for the {emp.department_name} department in current mapping.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="text-slate-600 font-medium">{emp.designation_name}</td>
                                <td className="text-slate-600 font-medium">{emp.department_name}</td>
                                <td className="text-slate-500 font-mono italic">
                                    {new Date(emp.date_of_join).toLocaleDateString()}
                                </td>
                                <td className="text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase border ${emp.status === 'ACTIVE'
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : 'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                        {emp.status}
                                    </span>
                                </td>
                                <td className="text-right">
                                    <button
                                        onClick={() => handleEdit(emp)}
                                        className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100"
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showForm && (
                <EmployeeForm
                    onClose={() => setShowForm(false)}
                    onSuccess={handleSuccess}
                    initialData={selectedEmp}
                />
            )}
        </div>
    );
}
