import { useState, useEffect } from 'react';
import { Users, Search, MapPin, Briefcase, Activity } from 'lucide-react';
import * as ieAPI from '../api/ieService';

export default function IEEmployeesPage() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await ieAPI.getProductionEmployees();
            setEmployees(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.emp_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <Users size={24} />
                        </div>
                        Production Staff
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Personnel assigned to the Production Department.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search by ID or Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Content Section */}
            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEmployees.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                            <Users className="mx-auto text-gray-300 mb-4" size={48} />
                            <p className="text-gray-400 font-medium">No production staff found.</p>
                        </div>
                    ) : (
                        filteredEmployees.map(e => (
                            <div key={e.emp_id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all group relative overflow-hidden">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-inner">
                                            {e.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{e.name}</h4>
                                            <p className="text-xs font-mono text-gray-400 tracking-tight">{e.emp_id}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${e.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {e.status}
                                    </span>
                                </div>

                                <div className="space-y-2.5 pt-4 border-t border-gray-50">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Briefcase size={14} className="text-gray-400" />
                                        <span className="font-medium">{e.designation_name || 'No Designation'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <MapPin size={14} className="text-gray-400" />
                                        <div className="flex items-center gap-1.5">
                                            {e.line_name ? (
                                                <>
                                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded leading-none flex items-center gap-1">
                                                        <Activity size={10} /> {e.line_name}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">Assigned Line</span>
                                                </>
                                            ) : (
                                                <span className="text-gray-400 italic font-normal">Unassigned</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Decorator */}
                                <div className="absolute -bottom-2 -right-2 transform translate-x-4 translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500 opacity-5">
                                    <Users size={80} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

