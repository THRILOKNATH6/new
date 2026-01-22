import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import cuttingService from '../api/cuttingService';
import CuttingForm from '../components/CuttingForm';
import PercentagePanel from '../components/PercentagePanel';

const CuttingEntryPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [cuttingInputs, setCuttingInputs] = useState({});
    const [layNo, setLayNo] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        fetchDetails();
    }, [id]);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const res = await cuttingService.getOrderDetails(id);
            setData(res.data);
            // Initialize inputs with 0
            const initialInputs = {};
            res.data.stats.sizes.forEach(s => {
                initialInputs[s.size] = '';
            });
            setCuttingInputs(initialInputs);
        } catch (err) {
            setError(err.message || 'Failed to fetch order details');
        } finally {
            setLoading(false);
        }
    };

    const handleQtyChange = (size, value) => {
        setCuttingInputs(prev => ({
            ...prev,
            [size]: value
        }));
        setError(null);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const cuttings = Object.entries(cuttingInputs)
                .map(([size, qty]) => ({
                    size,
                    qty: parseInt(qty || 0, 10)
                }))
                .filter(c => c.qty > 0);

            if (cuttings.length === 0) {
                throw new Error('Please enter at least one quantity');
            }

            const res = await cuttingService.saveCutting(id, {
                layNo: parseInt(layNo, 10),
                cuttings
            });

            setData(prev => ({ ...prev, stats: res.data }));
            setSuccessMessage('Cutting entries saved successfully!');

            // Increment Lay No for next entry if desired, or reset inputs
            setLayNo(prev => prev + 1);
            const resetInputs = {};
            data.stats.sizes.forEach(s => {
                resetInputs[s.size] = '';
            });
            setCuttingInputs(resetInputs);

            setTimeout(() => setSuccessMessage(null), 5000);

        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center text-white/60">Loading session...</div>;
    if (!data) return <div className="p-20 text-center text-red-400">Error: {error}</div>;

    const { order, stats } = data;

    return (
        <div className="flex flex-col gap-4">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard/production/cutting')}
                        className="p-1.5 hover:bg-slate-200 border border-slate-300 rounded text-slate-600 transition-none"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">
                            CUTTING REGISTRY • PO #{order.order_id}
                        </h1>
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                            Buyer: <span className="font-bold text-slate-700">{order.buyer}</span> | Style: <span className="font-bold text-slate-700">{order.style_id}</span>
                        </p>
                    </div>
                </div>
                <div className="px-3 py-1 bg-slate-800 text-white rounded text-[10px] font-black uppercase tracking-[0.2em]">
                    Operational Tier: Cutting Manager
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-start">
                <div className="lg:col-span-8 space-y-2">
                    {error && (
                        <div className="bg-red-50 border border-red-200 p-2 rounded text-[11px] text-red-700 font-bold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="bg-emerald-50 border border-emerald-200 p-2 rounded text-[11px] text-emerald-700 font-bold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                            {successMessage}
                        </div>
                    )}

                    <CuttingForm
                        order={order}
                        sizes={stats.sizes}
                        cuttingData={cuttingInputs}
                        layNo={layNo}
                        onQtyChange={handleQtyChange}
                        onLayNoChange={setLayNo}
                        onSave={handleSave}
                        loading={saving}
                    />
                </div>

                <div className="lg:col-span-4 lg:sticky lg:top-0">
                    <PercentagePanel stats={stats} />
                </div>
            </div>
        </div>
    );
};

export default CuttingEntryPage;
