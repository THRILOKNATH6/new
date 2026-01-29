import { useState, useEffect } from 'react';
import * as hrAPI from '../api/hrService';
import { X, Save } from 'lucide-react';

export default function EmployeeForm({ onClose, onSuccess, initialData = null }) {
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        gender: 'MALE',
        dateOfJoin: '',
        salary: '',
        designationId: '',
        departmentId: '',
        status: 'ACTIVE'
    });

    // Masters for dropdowns
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [mappings, setMappings] = useState([]);
    const [filteredDesignations, setFilteredDesignations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadMasters();
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                address: initialData.address || '',
                gender: initialData.gender || 'MALE',
                dateOfJoin: initialData.date_of_join ? initialData.date_of_join.split('T')[0] : '',
                salary: initialData.salary || '',
                designationId: initialData.designation_id || '',
                departmentId: initialData.department_id || '',
                status: initialData.status || 'ACTIVE'
            });
        }
    }, [initialData]);

    useEffect(() => {
        if (formData.departmentId && mappings.length > 0) {
            const currentMapping = mappings.find(m => m.department_id === parseInt(formData.departmentId));
            const allowedIds = currentMapping?.allowed_designations?.map(d => d.designation_id) || [];

            const filtered = designations.filter(d => allowedIds.includes(d.designation_id));
            setFilteredDesignations(filtered);

            // If current designation is NOT in the allowed list for the NEW department, clear it
            if (formData.designationId && !allowedIds.includes(parseInt(formData.designationId))) {
                setFormData(prev => ({ ...prev, designationId: '' }));
            }
        } else {
            setFilteredDesignations(designations);
        }
    }, [formData.departmentId, mappings, designations]);

    const loadMasters = async () => {
        try {
            const [deptRes, desigRes, mappingRes] = await Promise.all([
                hrAPI.getDepartments(),
                hrAPI.getDesignations(),
                hrAPI.getMappings()
            ]);
            setDepartments(deptRes.data || []);
            setDesignations(desigRes.data || []);
            setMappings(mappingRes.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (initialData) {
                // Update
                await hrAPI.updateEmployee(initialData.emp_id, formData);
            } else {
                // Create
                await hrAPI.createEmployee(formData);
            }
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">
                        {initialData ? 'Edit Employee' : 'New Employee'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[80vh]">
                    {error && <div className="bg-red-50 text-red-600 p-3 mb-4 rounded">{error}</div>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full px-3 py-2 border rounded-md"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        {/* Designation */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Designation *</label>
                            <select
                                required
                                className="mt-1 block w-full px-3 py-2 border rounded-md"
                                value={formData.designationId}
                                onChange={e => setFormData({ ...formData, designationId: e.target.value })}
                            >
                                <option value="">Select Role</option>
                                {filteredDesignations.map(d => (
                                    <option key={d.designation_id} value={d.designation_id}>
                                        {d.designation_name}
                                    </option>
                                ))}
                            </select>
                            {formData.departmentId && filteredDesignations.length === 0 && (
                                <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">No allowed designations for this department</p>
                            )}
                        </div>

                        {/* Department */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Department *</label>
                            <select
                                required
                                className="mt-1 block w-full px-3 py-2 border rounded-md"
                                value={formData.departmentId}
                                onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                            >
                                <option value="">Select Dept</option>
                                {departments.map(d => (
                                    <option key={d.department_id} value={d.department_id}>
                                        {d.department_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date of Join */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Joining Date *</label>
                            <input
                                type="date"
                                required
                                className="mt-1 block w-full px-3 py-2 border rounded-md"
                                value={formData.dateOfJoin}
                                onChange={e => setFormData({ ...formData, dateOfJoin: e.target.value })}
                            />
                        </div>

                        {/* Salary */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Salary</label>
                            <input
                                type="number"
                                className="mt-1 block w-full px-3 py-2 border rounded-md"
                                value={formData.salary}
                                onChange={e => setFormData({ ...formData, salary: e.target.value })}
                            />
                        </div>

                        {/* Gender */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Gender</label>
                            <select
                                className="mt-1 block w-full px-3 py-2 border rounded-md"
                                value={formData.gender}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                            >
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        {/* Status (Edit Only) */}
                        {initialData && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select
                                    className="mt-1 block w-full px-3 py-2 border rounded-md"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                    <option value="SUSPENDED">Suspended</option>
                                </select>
                            </div>
                        )}

                        {/* Address */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Address</label>
                            <textarea
                                className="mt-1 block w-full px-3 py-2 border rounded-md"
                                rows="2"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Employee'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
