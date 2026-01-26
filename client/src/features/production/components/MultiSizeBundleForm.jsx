import React, { useState, useEffect } from 'react';
import { Package, Save, X, AlertCircle, CheckCircle, RefreshCw, BarChart3 } from 'lucide-react';
import BundleSizeRow from './BundleSizeRow';
import bundleService from '../api/bundleService';

const MultiSizeBundleForm = ({ orderId, styleId, colourCode, onSuccess, onCancel }) => {
    const [bundleStats, setBundleStats] = useState(null);
    const [availableEntries, setAvailableEntries] = useState({});
    const [sizeData, setSizeData] = useState({});
    const [startingNumber, setStartingNumber] = useState(0);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState(null);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [autoCalculateRanges, setAutoCalculateRanges] = useState(true);

    // Fetch initial data
    useEffect(() => {
        if (orderId && styleId && colourCode) {
            fetchInitialData();
        }
    }, [orderId, styleId, colourCode]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Get bundle statistics for all sizes
            const statsResponse = await bundleService.getBundleStats(orderId);
            setBundleStats(statsResponse.data);

            // Get next bundle number for range calculation
            try {
                const nextNumberResponse = await bundleService.getNextBundleNumber(styleId, colourCode);
                setStartingNumber(nextNumberResponse.data.nextStartingNumber);
            } catch (err) {
                // If no existing bundles, start from 1
                setStartingNumber(1);
            }

            // Get available cutting entries for sizes with available quantity
            const sizesWithAvailability = statsResponse.data.sizes.filter(
                size => size.availableForBundling > 0
            );

            const entriesData = {};
            for (const size of sizesWithAvailability) {
                try {
                    const entriesResponse = await bundleService.getAvailableCuttingEntries(orderId, size.size);
                    entriesData[size.size] = entriesResponse.data.data;
                } catch (err) {
                    console.error(`Failed to fetch entries for size ${size.size}:`, err);
                    entriesData[size.size] = [];
                }
            }
            setAvailableEntries(entriesData);

            // Calculate summary statistics for advanced options
            const totalAvailable = sizesWithAvailability.reduce((sum, size) => 
                sum + (size.availableForBundling || 0), 0
            );
            const totalSizes = sizesWithAvailability.length;
        } catch (err) {
            console.error('Failed to fetch initial data:', err);
            setErrors({ general: err.response?.data?.message || 'Failed to load bundling data' });
        } finally {
            setLoading(false);
        }
    };

    const handleSizeDataChange = (data) => {
        setSizeData(prev => ({
            ...prev,
            [data.size]: data
        }));
        
        // Clear errors for this size when data changes
        if (errors[data.size]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[data.size];
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        const validationErrors = {};

        Object.entries(sizeData).forEach(([sizeName, data]) => {
            const sizeErrors = {};

            // Check if bundle quantity is provided
            if (!data.bundleQty || data.bundleQty <= 0) {
                // Skip validation if no quantity entered (optional size)
                return;
            }

            // Validate against available quantity
            if (data.bundleQty > data.availableForBundling) {
                sizeErrors.bundleQty = `Exceeds available quantity (${data.availableForBundling})`;
            }

            // Validate cutting entry selection
            if (!data.cuttingId) {
                sizeErrors.cuttingId = 'Please select a cutting entry';
            }

            // Validate cutting entry has enough quantity
            const selectedEntry = availableEntries[sizeName]?.find(
                entry => entry.cutting_id === parseInt(data.cuttingId)
            );
            if (selectedEntry && data.bundleQty > selectedEntry.available_qty) {
                sizeErrors.bundleQty = `Exceeds lay quantity (${selectedEntry.available_qty})`;
            }

            // Advanced validation: range continuity
            if (autoCalculateRanges) {
                const allBundles = Object.entries(sizeData)
                    .filter(([sizeName, data]) => data.bundleQty && data.bundleQty > 0)
                    .map(([sizeName, data]) => data);

                let prevEndingNo = null;
                for (let i = 0; i < allBundles.length; i++) {
                    const [currentSize, currentData] = allBundles[i];
                    if (i > 0) {
                        const [prevSize, prevData] = allBundles[i - 1];
                        if (prevSize && prevData.endingNo) {
                            prevEndingNo = prevData.endingNo;
                        }
                    }

                    if (prevEndingNo && currentData.startingNo !== prevEndingNo + 1) {
                        sizeErrors.bundleQty = `Bundle ranges must be continuous. Expected start: ${prevEndingNo + 1}, got: ${currentData.startingNo}`;
                    }
                }
            }

            if (Object.keys(sizeErrors).length > 0) {
                validationErrors[sizeName] = sizeErrors;
            }
        });

        // Check if at least one size has data
        const hasAnyBundleData = Object.values(sizeData).some(
            data => data.bundleQty && data.bundleQty > 0
        );

        if (!hasAnyBundleData) {
            validationErrors.general = 'Please enter bundle quantities for at least one size';
        }

        setErrors(validationErrors);
        return Object.keys(validationErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSubmitting(true);
        setSuccess(null);

        try {
            const bundlesToCreate = Object.entries(sizeData)
                .filter(([sizeName, data]) => data.bundleQty && data.bundleQty > 0)
                .map(([sizeName, data]) => ({
                    size: sizeName,
                    cuttingId: parseInt(data.cuttingId),
                    qty: parseInt(data.bundleQty),
                    startingNo: data.startingNo,
                    endingNo: data.endingNo
                }));

            let currentStartNumber = startingNumber;
            const createdBundles = [];
            const failedBundles = [];

            // Process bundles sequentially to maintain transaction integrity
            for (const bundle of bundlesToCreate) {
                try {
                    const bundleData = {
                        cuttingId: bundle.cuttingId,
                        qty: bundle.qty,
                        startingNo: currentStartNumber,
                        endingNo: currentStartNumber + bundle.qty - 1
                    };

                    const response = await bundleService.createBundle(bundleData);
                    createdBundles.push({
                        ...bundle,
                        bundleId: response.data.data.bundleId,
                        actualStartingNo: currentStartNumber,
                        actualEndingNo: currentStartNumber + bundle.qty - 1
                    });

                    // Increment for next bundle
                    currentStartNumber += bundle.qty;
                } catch (err) {
                    failedBundles.push({
                        ...bundle,
                        error: err.response?.data?.message || err.message
                    });
                    break; // Stop on first error for transaction safety
                }
            }

            if (failedBundles.length > 0) {
                setErrors({
                    general: `Failed to create bundles. Error: ${failedBundles[0].error}`
                });
            } else {
                setSuccess(`Successfully created ${createdBundles.length} bundles`);
                onSuccess && onSuccess(createdBundles);
                
                // Reset form after successful submission
                setTimeout(() => {
                    setSizeData({});
                    setErrors({});
                    setStartingNumber(currentStartNumber);
                }, 2000);
            }
        } catch (err) {
            console.error('Bundle creation failed:', err);
            setErrors({
                general: err.response?.data?.message || 'Failed to create bundles'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        setSizeData({});
        setErrors({});
        setSuccess(null);
        setStartingNumber(startingNumber); // Reset to original starting number
    };

    const handleToggleAdvancedOptions = () => {
        setShowAdvancedOptions(!showAdvancedOptions);
    };

    const handleCancel = () => {
        onCancel && onCancel();
    };

    const handleBulkOperations = (operation) => {
        const sizesWithAvailability = bundleStats?.sizes?.filter(
            size => size.availableForBundling > 0
        ) || [];

        switch (operation) {
            case 'fillMax':
                const newData = {};
                sizesWithAvailability.forEach(size => {
                    newData[size.size] = {
                        bundleQty: Math.min(size.availableForBundling, 
                            availableEntries[size.size]?.[0]?.available_qty || size.availableForBundling),
                        cuttingId: availableEntries[size.size]?.[0]?.cutting_id || '',
                        balance: 0,
                        startingNo: 0,
                        endingNo: 0,
                        availableForBundling: size.availableForBundling
                    };
                });
                setSizeData(newData);
                break;

            case 'clear':
                handleReset();
                break;

            case 'distribute':
                const totalBundleQty = Object.values(sizeData)
                    .reduce((sum, data) => sum + (parseInt(data.bundleQty) || 0), 0);
                const availableSizes = sizesWithAvailability.map(size => size.size);
                const avgQtyPerSize = Math.floor(totalBundleQty / availableSizes.length);
                
                const distributedData = {};
                availableSizes.forEach(size => {
                    const sizeInfo = sizesWithAvailability.find(s => s.size === size.size);
                    const maxQty = Math.min(avgQtyPerSize, sizeInfo?.availableForBundling || 0);
                    distributedData[size.size] = {
                        bundleQty: maxQty,
                        cuttingId: availableEntries[size.size]?.[0]?.cutting_id || '',
                        balance: (sizeInfo?.availableForBundling || 0) - maxQty,
                        startingNo: 0,
                        endingNo: 0,
                        availableForBundling: sizeInfo?.availableForBundling || 0
                    };
                });
                setSizeData(distributedData);
                break;

            default:
                break;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-slate-500">Loading bundling data...</div>
            </div>
        );
    }

    if (!bundleStats) {
        return (
            <div className="text-center py-8">
                <div className="text-red-500">Failed to load bundling data</div>
            </div>
        );
    }

    if (!orderId || !styleId || !colourCode) {
        return (
            <div className="text-center py-8">
                <div className="text-red-500">Missing required parameters</div>
            </div>
        );
    }

    const sizesWithAvailability = bundleStats.sizes.filter(
        size => size.availableForBundling > 0
    );

    if (sizesWithAvailability.length === 0) {
        return (
            <div className="text-center py-8 bg-slate-50 rounded border border-slate-200">
                <Package className="mx-auto text-slate-400 mb-2" size={48} />
                <div className="text-slate-600 font-medium">No quantities available for bundling</div>
                <div className="text-slate-400 text-sm mt-1">All cutting quantities have been bundled</div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-lg">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Package size={18} className="text-blue-600" />
                        <h3 className="text-[14px] font-bold text-slate-800">Multi-Size Bundling Entry</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleReset}
                            className="px-3 py-1 text-[11px] bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleToggleAdvancedOptions}
                            className="px-3 py-1 text-[11px] bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                            {showAdvancedOptions ? 'Hide Options' : 'Show Options'}
                        </button>
                        <button
                            onClick={handleCancel}
                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Advanced Options Panel */}
            {showAdvancedOptions && (
                <div className="px-4 py-3 bg-blue-50 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[12px] font-bold text-slate-700">
                            <BarChart3 size={16} className="mr-2" />
                            Bulk Operations
                        </h4>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleBulkOperations('fillMax')}
                                className="px-3 py-1 text-[10px] bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                                Fill Max Quantities
                            </button>
                            <button
                                onClick={() => handleBulkOperations('distribute')}
                                className="px-3 py-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                                Distribute Evenly
                            </button>
                            <button
                                onClick={() => handleBulkOperations('clear')}
                                className="px-3 py-1 text-[10px] bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-600">
                        <div>
                            <strong>Total Available:</strong> {totalAvailable} pieces
                        </div>
                        <div>
                            <strong>Sizes Available:</strong> {totalSizes} sizes
                        </div>
                        <div>
                            <strong>Auto Calculate:</strong>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={autoCalculateRanges}
                                    onChange={(e) => setAutoCalculateRanges(e.target.checked)}
                                    className="rounded border-slate-300 text-blue-600"
                                />
                                Ensure continuous bundle ranges
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Error/Success Messages */}
            {errors.general && (
                <div className="m-4 p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-600" />
                    <span className="text-[12px] text-red-700 font-medium">{errors.general}</span>
                </div>
            )}

            {success && (
                <div className="m-4 p-3 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-[12px] text-green-700 font-medium">{success}</span>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="overflow-x-auto">
                    <table className="w-full op-table">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-700 uppercase">Size</th>
                                <th className="px-3 py-2 text-center text-[11px] font-bold text-slate-700 uppercase">Order Qty</th>
                                <th className="px-3 py-2 text-center text-[11px] font-bold text-slate-700 uppercase">Cutting Qty</th>
                                <th className="px-3 py-2 text-center text-[11px] font-bold text-slate-700 uppercase">Bundle Qty</th>
                                <th className="px-3 py-2 text-center text-[11px] font-bold text-slate-700 uppercase">Balance</th>
                                <th className="px-3 py-2 text-center text-[11px] font-bold text-slate-700 uppercase">Lay No.</th>
                                <th className="px-3 py-2 text-center text-[11px] font-bold text-slate-700 uppercase">Starting No.</th>
                                <th className="px-3 py-2 text-center text-[11px] font-bold text-slate-700 uppercase">Ending No.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sizesWithAvailability.map(size => (
                                <BundleSizeRow
                                    key={size.size}
                                    size={size}
                                    availableEntries={availableEntries[size.size]}
                                    onDataChange={handleSizeDataChange}
                                    errors={errors[size.size] || {}}
                                    startingNumber={startingNumber}
                                />
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-50 border-t-2 border-slate-300">
                                <td colSpan="8" className="px-3 py-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[11px] text-slate-600">
                                            <strong>Note:</strong> Enter bundle quantities for desired sizes and select corresponding cutting entries
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="px-4 py-2 bg-blue-600 text-white rounded text-[12px] font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                        >
                                            <Save size={14} />
                                            {submitting ? 'Creating Bundles...' : 'Create All Bundles'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </form>
        </div>
    );
};

export default MultiSizeBundleForm;