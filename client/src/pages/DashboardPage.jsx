import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
    const { user } = useAuth();
    // Header and Sidebar are now handled by DashboardLayout.
    // This component only renders the main content area.

    return (
        <div className="flex flex-col gap-2">
            {/* TOP ROW: Metric Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                    { label: 'Active Lines', value: '18/24', change: '+2', status: 'normal' },
                    { label: 'Output (PCS)', value: '14,204', change: '86%', status: 'success' },
                    { label: 'Avg Efficiency', value: '82.4%', change: '2.1%', status: 'warning' },
                    { label: 'DHU Rate', value: '1.45%', change: '-0.2%', status: 'success' },
                    { label: 'Labor Cost', value: '$3.42', change: '0.04', status: 'normal' }
                ].map((m, i) => (
                    <div key={i} className="op-card flex flex-col justify-between h-16">
                        <div className="metric-label">{m.label}</div>
                        <div className="flex items-baseline justify-between mt-1">
                            <div className="metric-value">{m.value}</div>
                            <div className={`text-[10px] font-bold ${m.status === 'success' ? 'text-green-600' : 'text-slate-500'}`}>
                                {m.change}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* MIDDLE SECTION: Live Status & Task Tracking */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-2 op-card min-h-[180px]">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-[12px] font-black uppercase text-slate-500 tracking-wider">Production Status (Live)</h3>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">Live Sync</span>
                    </div>
                    <div className="space-y-3 mt-4">
                        {[
                            { line: 'LINE 04', style: 'POLO-2024', target: 800, actual: 642, status: 'on-track' },
                            { line: 'LINE 08', style: 'TEE-BASIC', target: 1200, actual: 890, status: 'warning' },
                            { line: 'LINE 12', style: 'DENIM-X1', target: 450, actual: 440, status: 'on-track' }
                        ].map((l, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-slate-800">{l.line} | {l.style}</span>
                                    <span className="text-slate-500">{l.actual} / {l.target} PCS</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${l.status === 'on-track' ? 'bg-blue-500' : 'bg-amber-500'}`}
                                        style={{ width: `${(l.actual / l.target) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="op-card">
                    <h3 className="text-[12px] font-black uppercase text-slate-500 tracking-wider mb-2">Critical Alerts</h3>
                    <div className="space-y-1.5">
                        {[
                            { id: 'QA-109', type: 'Quality', msg: 'DHU spike on L04', time: '4m' },
                            { id: 'M-442', type: 'Machine', msg: 'Needle break L18', time: '12m' },
                            { id: 'E-002', type: 'HR', msg: 'Operator absent L02', time: '21m' }
                        ].map((a, i) => (
                            <div key={i} className="p-2 bg-slate-50 border-l-2 border-slate-300 flex justify-between items-start">
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 leading-none mb-1">{a.type}</div>
                                    <div className="text-[11px] font-bold text-slate-700 leading-tight">{a.msg}</div>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">{a.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* BOTTOM SECTION: Real-Time Event Log */}
            <div className="op-card overflow-hidden !p-0">
                <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-[12px] font-black uppercase text-slate-500 tracking-wider">Global Operations Registry</h3>
                    <div className="flex gap-2">
                        <button className="text-[10px] font-bold text-blue-600 hover:underline">Export CSV</button>
                    </div>
                </div>
                <table className="op-table">
                    <thead>
                        <tr>
                            <th>Ref ID</th>
                            <th>Timestamp</th>
                            <th>Operation</th>
                            <th>Target</th>
                            <th>Variance</th>
                            <th className="text-right">Action Log</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { id: 'CT-244', time: '11:24:02', op: 'CUTTING #04', target: '2.5k', var: '-0.21%', user: 'thrilok' },
                            { id: 'SE-991', time: '11:18:45', op: 'STITCHING L12', target: '440', var: '+1.44%', user: 'manager_ie' },
                            { id: 'QA-002', time: '11:04:12', op: 'AUDIT L03', target: '98%', var: '-1.02%', user: 'admin' },
                            { id: 'LD-441', time: '10:55:30', op: 'LOADING S1', target: '40ft', var: '0.00%', user: 'store_op' },
                            { id: 'PK-110', time: '10:48:22', op: 'PACKING B4', target: '1.2k', var: '-4.12%', user: 'ie_user' }
                        ].map((row, idx) => (
                            <tr key={idx}>
                                <td className="font-mono font-bold text-blue-600">{row.id}</td>
                                <td className="font-mono text-slate-400">{row.time}</td>
                                <td className="font-black text-slate-700">{row.op}</td>
                                <td className="font-bold text-slate-500">{row.target}</td>
                                <td className={`${row.var.startsWith('-') ? 'text-red-500' : 'text-green-600'} font-bold`}>{row.var}</td>
                                <td className="text-right text-[10px] font-bold text-slate-400 uppercase">{row.user}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
