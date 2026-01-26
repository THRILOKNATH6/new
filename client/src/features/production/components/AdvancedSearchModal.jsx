import React, { useState, useEffect } from 'react';
import { X, Search, Filter } from 'lucide-react';
import cuttingService from '../api/cuttingService';

const AdvancedSearchModal = ({ isOpen, onClose, onOrderSelect }) => {
    const [searchCriteria, setSearchCriteria] = useState({
        style_id: '',
        order_id: '',
        buyer: '',
        po: ''
    });
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        pages: 0
    });
    const [activeFields, setActiveFields] = useState({
        style_id: false,
        order_id: false,
        buyer: false,
        po: false
    });

    useEffect(() => {
        if (isOpen) {
            handleSearch();
        }
    }, [isOpen]);

    const handleFieldToggle = (field) => {
        setActiveFields(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleInputChange = (field, value) => {
        setSearchCriteria(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSearch = async (page = 1) => {
        setLoading(true);
        try {
            const searchParams = {
                ...searchCriteria,
                limit: pagination.limit,
                offset: (page - 1) * pagination.limit,
                sort_by: 'order_id',
                sort_order: 'DESC'
            };

            // Only include active fields in search
            Object.keys(activeFields).forEach(field => {
                if (!activeFields[field] || !searchParams[field]) {
                    delete searchParams[field];
                }
            });

            const response = await cuttingService.searchOrders(searchParams);
            setResults(response.data.orders);
            setPagination(response.data.pagination);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOrderClick = (order) => {
        onOrderSelect(order);
        onClose();
    };

    const handleClearFilters = () => {
        setSearchCriteria({
            style_id: '',
            order_id: '',
            buyer: '',
            po: ''
        });
        setActiveFields({
            style_id: false,
            order_id: false,
            buyer: false,
            po: false
        });
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
        handleSearch(newPage);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <Filter size={20} className="text-blue-600" />
                        <h2 className="text-lg font-bold text-slate-800">Advanced Order Search</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search Criteria */}
                <div className="p-6 border-b border-slate-200">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Style ID */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="style_id"
                                    checked={activeFields.style_id}
                                    onChange={() => handleFieldToggle('style_id')}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="style_id" className="text-sm font-medium text-slate-700">
                                    Style ID
                                </label>
                            </div>
                            <input
                                type="text"
                                placeholder="Enter style ID..."
                                value={searchCriteria.style_id}
                                onChange={(e) => handleInputChange('style_id', e.target.value)}
                                disabled={!activeFields.style_id}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                        </div>

                        {/* Order ID */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="order_id"
                                    checked={activeFields.order_id}
                                    onChange={() => handleFieldToggle('order_id')}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="order_id" className="text-sm font-medium text-slate-700">
                                    Order ID
                                </label>
                            </div>
                            <input
                                type="text"
                                placeholder="Enter order ID..."
                                value={searchCriteria.order_id}
                                onChange={(e) => handleInputChange('order_id', e.target.value)}
                                disabled={!activeFields.order_id}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                        </div>

                        {/* Buyer */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="buyer"
                                    checked={activeFields.buyer}
                                    onChange={() => handleFieldToggle('buyer')}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="buyer" className="text-sm font-medium text-slate-700">
                                    Buyer
                                </label>
                            </div>
                            <input
                                type="text"
                                placeholder="Enter buyer name..."
                                value={searchCriteria.buyer}
                                onChange={(e) => handleInputChange('buyer', e.target.value)}
                                disabled={!activeFields.buyer}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                        </div>

                        {/* PO */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="po"
                                    checked={activeFields.po}
                                    onChange={() => handleFieldToggle('po')}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="po" className="text-sm font-medium text-slate-700">
                                    Purchase Order
                                </label>
                            </div>
                            <input
                                type="text"
                                placeholder="Enter PO number..."
                                value={searchCriteria.po}
                                onChange={(e) => handleInputChange('po', e.target.value)}
                                disabled={!activeFields.po}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-4">
                        <button
                            onClick={() => handleSearch(1)}
                            disabled={loading || !Object.values(activeFields).some(v => v)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                        <button
                            onClick={handleClearFilters}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-auto p-6">
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">Searching orders...</div>
                    ) : results.length > 0 ? (
                        <div className="space-y-4">
                            {/* Results Summary */}
                            <div className="flex items-center justify-between text-sm text-slate-600">
                                <span>Found {pagination.total} orders</span>
                                <span>Page {pagination.page} of {pagination.pages}</span>
                            </div>

                            {/* Results Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {results.map((order) => (
                                    <div
                                        key={order.order_id}
                                        onClick={() => handleOrderClick(order)}
                                        className="p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-slate-800">#{order.order_id}</h3>
                                            <span className="text-xs text-slate-500">{order.colour_code}</span>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Buyer:</span>
                                                <span className="font-medium">{order.buyer}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Style:</span>
                                                <span className="font-medium">{order.style_id}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">PO:</span>
                                                <span className="font-medium">{order.po || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t border-slate-200">
                                                <span className="text-slate-600">Total Qty:</span>
                                                <span className="font-bold">{order.order_quantity}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {pagination.pages > 1 && (
                                <div className="flex items-center justify-center gap-2 mt-6">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                                    >
                                        Previous
                                    </button>
                                    <span className="px-3 py-1 text-sm text-slate-600">
                                        Page {pagination.page} of {pagination.pages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page === pagination.pages}
                                        className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400">
                            {Object.values(activeFields).some(v => v) 
                                ? 'No orders match your search criteria.' 
                                : 'Select search fields and enter criteria to find orders.'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedSearchModal;