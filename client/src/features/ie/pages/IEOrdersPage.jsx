import { useState, useEffect } from 'react';
import { Eye, FileText, X, Search, Filter } from 'lucide-react';
import * as ieAPI from '../api/ieService';

export default function IEOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const data = await ieAPI.getOrders();
            setOrders(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleView = async (id) => {
        try {
            const details = await ieAPI.getOrderDetails(id);
            setSelectedOrder(details);
        } catch (e) {
            alert("Failed to load details");
        }
    };

    const filteredOrders = orders.filter(o =>
        o.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.po.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.order_id.toString().includes(searchTerm)
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <FileText size={24} />
                        </div>
                        Buyer Orders
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">View all active production orders with read-only access.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search by PO or Buyer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                    <button className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors">
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Buyer / Brand</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">PO Number</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total Quantity</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                            No orders found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map(o => (
                                        <tr key={o.order_id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">#{o.order_id}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{o.buyer}</div>
                                                <div className="text-xs text-gray-500">{o.brand || 'No Brand'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-gray-700 font-medium">{o.po}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{o.order_quantity.toLocaleString()}</div>
                                                <div className="text-[10px] text-gray-400 uppercase tracking-tighter font-bold">Total Pieces</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleView(o.order_id)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-600 hover:text-white transition-all transform group-hover:scale-105"
                                                >
                                                    <Eye size={16} /> View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal - Advanced Glassmorphism Detail View */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden relative border border-white/20">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                    <FileText size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold">Order Details</h3>
                                    <p className="text-blue-100 font-mono">#{selectedOrder.order_id} | {selectedOrder.po}</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Buyer</p>
                                    <p className="font-semibold text-gray-900">{selectedOrder.buyer}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Style</p>
                                    <p className="font-semibold text-gray-900">{selectedOrder.style_id}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Colour Code</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                        <p className="font-semibold text-gray-900">{selectedOrder.colour_code}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Quantity</p>
                                    <p className="font-bold text-blue-600 text-lg">{selectedOrder.order_quantity.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Size-wise Decomposition</h4>
                                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Verified Data</span>
                                </div>

                                {Object.keys(selectedOrder.quantities || {}).length > 0 ? (
                                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                        {Object.entries(selectedOrder.quantities).map(([size, qty]) => (
                                            <div key={size} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl text-center group hover:bg-white hover:shadow-md hover:border-blue-100 transition-all">
                                                <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">{size}</div>
                                                <div className="text-xl font-bold text-gray-800">{qty}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-12 text-center">
                                        <p className="text-gray-400 italic">No breakdown available for this order.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 p-6 flex justify-end">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

