import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, ChevronRight, Filter } from 'lucide-react';
import cuttingService from '../api/cuttingService';
import AdvancedSearchModal from '../components/AdvancedSearchModal';

const CuttingDashboardPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await cuttingService.getOrders();
                setOrders(res.data);
            } catch (err) {
                console.error('Failed to fetch orders:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const filteredOrders = orders.filter(o =>
        o.order_id.toString().includes(searchTerm) ||
        o.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.style_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOrderSelect = (order) => {
        navigate(`/dashboard/production/cutting/${order.order_id}`);
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Loading available orders...</div>;

    return (
        <div className="flex flex-col gap-4">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">Cutting Module</h1>
                    <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Select an order to record cutting entries</p>
                </div>
            </header>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by Order ID, Buyer, or Style..."
                        className="w-full bg-white border border-slate-300 rounded py-2 pl-10 pr-4 text-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setShowAdvancedSearch(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 text-[12px] font-medium"
                >
                    <Filter size={14} />
                    Advanced Search
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                        <div
                            key={order.order_id}
                            onClick={() => navigate(`/dashboard/production/cutting/${order.order_id}`)}
                            className="op-card hover:border-blue-500 transition-none cursor-pointer group relative"
                        >
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight className="text-blue-600" size={16} />
                            </div>

                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-50 border border-blue-100 rounded text-blue-600">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-none mb-1">Order ID</p>
                                    <h3 className="text-[14px] font-black text-slate-800">#{order.order_id}</h3>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-400 font-bold uppercase">Buyer</span>
                                    <span className="text-slate-800 font-black">{order.buyer}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-400 font-bold uppercase">Style</span>
                                    <span className="text-slate-800 font-black">{order.style_id}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-400 font-bold uppercase">Color</span>
                                    <span className="text-slate-800 font-black">{order.colour_code}</span>
                                </div>
                                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Total Qty</span>
                                    <span className="text-slate-800 font-black text-[13px]">{order.order_quantity}</span>
                                </div>
                                {order.cutting_completion_percentage !== undefined && (
                                    <div className="pt-1 border-t border-slate-200 flex justify-between items-center">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Cutting</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[13px] font-black ${
                                                order.cutting_completion_percentage >= 100 ? 'text-green-600' : 'text-blue-600'
                                            }`}>
                                                {order.cutting_completion_percentage}%
                                            </span>
                                            {order.cutting_completion_percentage >= 100 && (
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                                                    Complete
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center text-slate-400 bg-slate-50 rounded border border-dashed border-slate-300">
                        {searchTerm ? 'No orders match your search query.' : 'No orders available for cutting.'}
                    </div>
                )}
            </div>

            {/* Advanced Search Modal */}
            <AdvancedSearchModal
                isOpen={showAdvancedSearch}
                onClose={() => setShowAdvancedSearch(false)}
                onOrderSelect={handleOrderSelect}
            />
        </div>
    );
};

export default CuttingDashboardPage;
