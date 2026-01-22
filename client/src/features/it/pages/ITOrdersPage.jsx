import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Package, RefreshCcw } from 'lucide-react';
import OrderForm from '../components/OrderForm';
import * as itAPI from '../api/itService';

export default function ITOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await itAPI.getOrders();
            setOrders(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = async (order) => {
        try {
            // Fetch full details including dynamic quantities
            const fullOrder = await itAPI.getOrderDetails(order.order_id);
            setEditingOrder(fullOrder);
            setShowForm(true);
        } catch (err) {
            alert('Failed to load order details');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this order? This will also remove the associated size quantities.')) return;
        try {
            await itAPI.deleteOrder(id);
            loadOrders();
        } catch (err) {
            alert(err.response?.data?.message || 'Delete failed');
        }
    };

    const filteredOrders = orders.filter(o =>
        o.po?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.style_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.buyer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.oc?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (showForm) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => { setShowForm(false); setEditingOrder(null); }}
                        className="text-gray-500 hover:text-gray-700 font-medium"
                    >
                        ← Back to List
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {editingOrder ? `Edit Order: ${editingOrder.po}` : 'Create New Order'}
                    </h1>
                </div>
                <OrderForm
                    initialData={editingOrder}
                    onSuccess={() => { setShowForm(false); setEditingOrder(null); loadOrders(); }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Package className="text-blue-600" /> Order Management
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">System-wide order control and size-category routing.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadOrders}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-black uppercase rounded-full tracking-wider">IT MANAGER ACCESS</span>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-100 transition-all"
                    >
                        <Plus size={20} /> New Production Order
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by PO, Style, Buyer or OC..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500/20 transition-all"
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Order ID</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Buyer & Brand</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Style ID</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">PO Number</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">OC</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none text-right">Qty</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none text-right pr-10">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-10 text-center text-gray-400 font-medium">Loading orders from mainframe...</td>
                            </tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-10 text-center text-gray-400 font-medium">No orders found matching your search.</td>
                            </tr>
                        ) : filteredOrders.map(o => (
                            <tr key={o.order_id} className="hover:bg-gray-50 group transition-colors">
                                <td className="px-6 py-4 font-mono text-xs text-gray-400">#{o.order_id}</td>
                                <td className="px-6 py-4 leading-none">
                                    <div className="text-sm font-bold text-gray-800">{o.buyer}</div>
                                    <div className="text-[10px] font-bold text-blue-500 mt-1 uppercase leading-none">{o.brand}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs font-black text-gray-700">{o.style_id}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded inline-block">{o.po}</div>
                                </td>
                                <td className="px-6 py-4 text-xs font-medium text-gray-500">{o.oc || '-'}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="text-sm font-black text-gray-900">{o.order_quantity?.toLocaleString()}</div>
                                </td>
                                <td className="px-6 py-4 text-right pr-6 leading-none">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(o)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit Order"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(o.order_id)}
                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Delete Order"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
