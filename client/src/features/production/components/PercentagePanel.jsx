import React from 'react';

const PercentagePanel = ({ stats }) => {
    if (!stats) return null;

    return (
        <div className="flex flex-col gap-2">
            <div className="op-card">
                <div className="text-center">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">
                        Overall Cutting Yield
                    </h3>
                    <div className="relative h-32 w-32 mx-auto flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                            <circle cx="64" cy="64" r="56" className="stroke-slate-200 fill-none" strokeWidth="8" />
                            <circle cx="64" cy="64" r="56" className="stroke-blue-600 fill-none transition-all duration-500" strokeWidth="8" strokeDasharray={`${(parseFloat(stats.totalPercentage) / 100) * 352} 352`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-slate-800">{stats.totalPercentage}%</span>
                        </div>
                    </div>

                    <div className="w-full mt-4 grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 border border-slate-200 rounded p-2">
                            <p className="text-slate-400 text-[9px] uppercase font-bold mb-0.5">Total Cut</p>
                            <p className="text-slate-800 text-[14px] font-black">{stats.totalCutQty}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded p-2">
                            <p className="text-slate-400 text-[9px] uppercase font-bold mb-0.5">Order Qty</p>
                            <p className="text-slate-800 text-[14px] font-black">{stats.totalOrderQty}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="op-card">
                <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    Size-wise Distribution
                </h4>
                <div className="space-y-3">
                    {stats.sizes.map((s) => (
                        <div key={s.size}>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-slate-600 font-bold uppercase text-[11px]">{s.size}</span>
                                <span className="text-slate-800 font-mono font-black text-[11px]">{s.percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-sm h-1.5 overflow-hidden border border-slate-200">
                                <div
                                    className="bg-blue-600 h-full transition-all duration-300"
                                    style={{ width: `${s.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PercentagePanel;
