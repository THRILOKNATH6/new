import { useState, useEffect } from 'react';
import { Plus, X, Save } from 'lucide-react';

export default function MasterDataManager({ title, fetchFunction, createFunction, columns }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({});
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchFunction();
            setData(res.data || []);
        } catch (err) {
            console.error("Failed to load data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await createFunction(formData); // Pass object or discrete args depending on function
            setShowModal(false);
            setFormData({});
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow h-full flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-gray-700">{title}</h3>
                <button
                    onClick={() => setShowModal(true)}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                >
                    <Plus size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
                {loading ? (
                    <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                {columns.map((col, idx) => (
                                    <th key={idx} className="px-4 py-2 font-medium">{col.header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((row, rIdx) => (
                                <tr key={rIdx}>
                                    {columns.map((col, cIdx) => (
                                        <td key={cIdx} className="px-4 py-2 text-gray-700">
                                            {row[col.accessor]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-4 text-center text-gray-400">
                                        No entries yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Simple Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h4 className="font-bold">Add {title}</h4>
                            <button onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-4">
                            {error && <div className="text-red-500 text-xs mb-3 bg-red-50 p-2 rounded">{error}</div>}

                            {/* Generic Name Input - Most masters just need a name */}
                            <div className="mb-4">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {/* Optional: Level for Designation */}
                            {title.includes('Designation') && (
                                <div className="mb-4">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Level (1-5)</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max="10"
                                        className="w-full px-3 py-2 border rounded-md text-sm"
                                        value={formData.level || 1}
                                        onChange={e => setFormData({ ...formData, level: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                                >
                                    <Save size={14} /> Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
