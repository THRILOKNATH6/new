import React from 'react';

const CuttingForm = ({ sizes, cuttingData, onQtyChange, onLayNoChange, layNo, onSave, loading }) => {
    return (
        <div className="op-card !p-0 overflow-hidden">
            <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                    <h2 className="text-[12px] font-black uppercase text-slate-800 tracking-tight">Cutting Entry Log</h2>
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded px-2 py-0.5">
                    <span className="text-[10px] text-slate-400 font-black uppercase">Batch No:</span>
                    <div className="flex items-center gap-1">
                        <span className="text-blue-600 font-bold text-[12px]">LAY #</span>
                        <input
                            type="number"
                            min="1"
                            className="w-12 bg-slate-50 border border-slate-200 rounded px-1 text-[12px] font-black text-slate-800 focus:border-blue-500 outline-none text-center"
                            value={layNo}
                            onChange={(e) => onLayNoChange(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="op-table">
                    <thead>
                        <tr>
                            <th>Dimension</th>
                            <th>Target Qty</th>
                            <th className="text-center">Progress</th>
                            <th className="text-right">New Entry</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sizes.map((item) => (
                            <tr key={item.size}>
                                <td className="font-black text-slate-800 text-[14px] uppercase">{item.size}</td>
                                <td className="font-bold text-slate-500">{item.orderQty} <span className="text-[9px]">PCS</span></td>
                                <td className="text-center">
                                    <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-blue-600">
                                        <span className="text-[11px] font-black">{item.cutQty}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">DONE</span>
                                    </div>
                                </td>
                                <td className="text-right">
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-[13px] font-black text-slate-900 focus:border-blue-500 outline-none text-right"
                                        value={cuttingData[item.size] || ''}
                                        onChange={(e) => onQtyChange(item.size, e.target.value)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                    onClick={onSave}
                    disabled={loading}
                    className="bg-slate-800 hover:bg-black disabled:bg-slate-300 text-white font-black py-2 px-8 rounded text-[11px] uppercase tracking-widest transition-none flex items-center gap-2"
                >
                    {loading ? 'Processing...' : 'Commit Transaction'}
                </button>
            </div>
        </div>
    );
};

export default CuttingForm;
