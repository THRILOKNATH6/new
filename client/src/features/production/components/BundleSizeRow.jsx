import React, { useState, useEffect } from 'react';

const BundleSizeRow = ({ 
    size, 
    availableEntries, 
    onDataChange, 
    errors = {},
    startingNumber,
    disabled = false 
}) => {
    const [bundleQty, setBundleQty] = useState('');
    const [selectedCuttingId, setSelectedCuttingId] = useState('');

    // Calculate balance whenever bundle qty changes
    useEffect(() => {
        const qty = parseInt(bundleQty) || 0;
        const availableForBundling = parseInt(size.availableForBundling) || 0;
        const calculatedBalance = availableForBundling - qty;
        
        // Notify parent of data change
        onDataChange({
            size: size.size,
            bundleQty: qty,
            cuttingId: selectedCuttingId,
            balance: calculatedBalance,
            startingNo: parseInt(startingNumber) || 0,
            endingNo: qty > 0 ? (parseInt(startingNumber) || 0) + qty - 1 : 0,
            availableForBundling
        });
    }, [bundleQty, selectedCuttingId, startingNumber, size.size]);

    const handleQtyChange = (value) => {
        const qty = parseInt(value) || 0;
        
        // Validate against available quantity
        if (qty > 0 && qty > size.availableForBundling) {
            return; // Don't allow exceeding available quantity
        }
        
        setBundleQty(value);
    };

    const handleCuttingEntryChange = (cuttingId) => {
        setSelectedCuttingId(cuttingId);
    };

    const hasError = Object.keys(errors).length > 0;
    const isDisabled = disabled || size.availableForBundling === 0;

    return (
        <tr className={`border-b border-slate-200 ${hasError ? 'bg-red-50' : 'hover:bg-slate-50'} transition-colors`}>
            <td className="px-3 py-2 text-[12px] font-medium text-slate-900">
                {size.size}
            </td>
            
            <td className="px-3 py-2 text-[12px] text-slate-700 text-center">
                {size.orderQty}
            </td>
            
            <td className="px-3 py-2 text-[12px] text-slate-700 text-center">
                {size.cutQty}
            </td>
            
            <td className="px-3 py-2">
                <input
                    type="number"
                    min="1"
                    max={size.availableForBundling}
                    value={bundleQty}
                    onChange={(e) => handleQtyChange(e.target.value)}
                    disabled={isDisabled}
                    placeholder="0"
                    className={`w-full px-2 py-1 text-[12px] border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.bundleQty ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    } ${isDisabled ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
                />
                {errors.bundleQty && (
                    <div className="text-[10px] text-red-600 mt-1">{errors.bundleQty}</div>
                )}
            </td>
            
            <td className="px-3 py-2 text-[12px] text-center font-medium">
                <span className={parseInt(bundleQty) > parseInt(size.availableForBundling) ? 'text-red-600' : parseInt(bundleQty) > 0 ? 'text-green-600' : 'text-slate-600'}>
                    {parseInt(bundleQty) > 0 ? parseInt(size.availableForBundling) - parseInt(bundleQty) : size.availableForBundling}
                </span>
            </td>
            
            <td className="px-3 py-2">
                <select
                    value={selectedCuttingId}
                    onChange={(e) => handleCuttingEntryChange(e.target.value)}
                    disabled={isDisabled || !bundleQty}
                    className={`w-full px-2 py-1 text-[12px] border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.cuttingId ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    } ${isDisabled || !bundleQty ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
                >
                    <option value="">Select Lay</option>
                    {availableEntries?.map(entry => (
                        <option key={entry.cutting_id} value={entry.cutting_id}>
                            Lay {entry.lay_no} - Available: {entry.available_qty} pcs
                        </option>
                    ))}
                </select>
                {errors.cuttingId && (
                    <div className="text-[10px] text-red-600 mt-1">{errors.cuttingId}</div>
                )}
            </td>
            
            <td className="px-3 py-2 text-[12px] text-slate-700 text-center">
                {bundleQty && startingNumber ? startingNumber : '-'}
            </td>
            
            <td className="px-3 py-2 text-[12px] text-slate-700 text-center">
                {bundleQty > 0 && startingNumber ? (parseInt(startingNumber) + parseInt(bundleQty) - 1) : '-'}
            </td>
        </tr>
    );
};

export default BundleSizeRow;