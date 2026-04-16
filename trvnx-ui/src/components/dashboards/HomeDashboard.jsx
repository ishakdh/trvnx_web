import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const HomeDashboard = ({ user, allDevices = [], financeLedger = [], marketingTargets = [] }) => {
    // --- FILTER STATES ---
    const [financeFilter, setFinanceFilter] = useState('month');

    // 🚀 NEW: Robust Marketing Filter States
    const [timeFilter, setTimeFilter] = useState('LAST_15_DAYS');
    const [monthFilter, setMonthFilter] = useState('ALL');

    // --- HELPER: GET START DATE FOR FINANCE ---
    const getStartDate = (filter) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        if (filter === 'week') d.setDate(d.getDate() - 7);
        if (filter === '15days') d.setDate(d.getDate() - 15);
        if (filter === 'month') d.setMonth(d.getMonth() - 1);
        return d;
    };

    // --- 🚀 NEW: STRICT UNIT-BASED MARKETING CALCULATION ---
    const { chartData, totalTarget, totalAchievement, achievementPct } = useMemo(() => {
        const now = new Date();

        // 1. Filter targets by selected Time or Month
        const filtered = marketingTargets.filter(t => {
            const tDate = new Date(t.start_date || t.createdAt);

            if (monthFilter !== 'ALL') {
                return tDate.getMonth() === parseInt(monthFilter) && tDate.getFullYear() === now.getFullYear();
            }

            if (timeFilter === 'LAST_DAY') {
                return tDate >= new Date(now.getTime() - (24 * 60 * 60 * 1000));
            } else if (timeFilter === 'LAST_7_DAYS') {
                return tDate >= new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            } else if (timeFilter === 'LAST_15_DAYS') {
                return tDate >= new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));
            }
            return true;
        });

        const grouped = {};
        let tTarget = 0;
        let tAchieve = 0;

        filtered.forEach(t => {
            const dateStr = new Date(t.start_date || t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            if (!grouped[dateStr]) grouped[dateStr] = { name: dateStr, Target: 0, Achievement: 0 };

            // 🚀 Force strict read of the Unit Target (Ignoring old money amounts)
            const targetAmt = Number(t.id_target || t.idTarget || 0);

            // 🚀 Force strict read of Real Units Achieved based on Device Activations in that timeframe
            let achieveAmt = 0;
            const sDate = t.start_date ? new Date(t.start_date).setHours(0,0,0,0) : 0;
            const eDate = t.end_date ? new Date(t.end_date).setHours(23,59,59,999) : Infinity;

            allDevices.forEach(d => {
                const dDate = new Date(d.createdAt).getTime();
                if (dDate >= sDate && dDate <= eDate) {
                    achieveAmt += 1;
                }
            });

            grouped[dateStr].Target += targetAmt;
            grouped[dateStr].Achievement += achieveAmt;
            tTarget += targetAmt;
            tAchieve += achieveAmt;
        });

        const dataArr = Object.values(grouped);
        const finalChartData = dataArr.length > 0 ? dataArr : [{ name: 'No Data', Target: 0, Achievement: 0 }];
        const pct = tTarget > 0 ? ((tAchieve / tTarget) * 100).toFixed(1) : 0;

        return { chartData: finalChartData, totalTarget: tTarget, totalAchievement: tAchieve, achievementPct: pct };
    }, [marketingTargets, allDevices, timeFilter, monthFilter]);

    const { income, expense } = useMemo(() => {
        const startDate = getStartDate(financeFilter);
        const filtered = financeLedger.filter(tx => new Date(tx.createdAt) >= startDate);

        const inc = filtered.filter(tx => tx.type === 'MANUAL_INCOME' || tx.type === 'RECHARGE').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        const exp = filtered.filter(tx => tx.type === 'MANUAL_EXPENSE' || tx.type === 'COMMISSION' || tx.type === 'SR_COMMISSION').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

        return { income: inc, expense: exp };
    }, [financeLedger, financeFilter]);

    // Device Stats (Real Time)
    const isMissingHeartbeat = (dateString) => { if (!dateString) return true; return (new Date() - new Date(dateString)) / (1000 * 60) > 125; };
    const activeDevices = allDevices.filter(d => !isMissingHeartbeat(d.last_heartbeat)).length;
    const lostSignals = allDevices.filter(d => isMissingHeartbeat(d.last_heartbeat)).length;
    const lockedDevices = allDevices.filter(d => d.is_locked).length;
    const unlockedDevices = allDevices.filter(d => !d.is_locked).length;
    const uninstalledDevices = allDevices.filter(d => d.license_status === 'UNINSTALLED').length;

    // --- REUSABLE BUTTON ---
    const FilterButton = ({ label, active, onClick }) => (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded text-[9px] font-black tracking-widest uppercase transition-all ${
                active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 border border-blue-500'
                    : 'bg-[#050A15] border border-[#273A60] text-gray-500 hover:text-gray-300 hover:bg-[#162447]'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 uppercase font-mono pb-4">

            {/* --- 🚀 MISSION CRITICAL SUMMARY --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#0A1128] border border-blue-500/20 p-4 rounded-lg shadow-xl relative overflow-hidden">
                    <div className="text-gray-500 text-[8px] tracking-[0.2em] mb-1">TOTAL_NODES_DEPLOYED</div>
                    <div className="text-2xl font-black text-white">{allDevices.length}</div>
                    <div className="text-[10px] text-blue-400 mt-2 italic font-black">Global Fleet Matrix</div>
                    <div className="absolute -right-2 -bottom-2 opacity-5 text-4xl italic">📱</div>
                </div>

                <div className="bg-[#0A1128] border border-green-500/20 p-4 rounded-lg shadow-xl relative overflow-hidden">
                    <div className="text-gray-500 text-[8px] tracking-[0.2em] mb-1">NET_REVENUE_INFLOW</div>
                    <div className="text-2xl font-black text-green-400">৳{income.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-500 mt-2 italic font-black">Filter-Synced Income</div>
                    <div className="absolute -right-2 -bottom-2 opacity-5 text-4xl italic">💰</div>
                </div>

                <div className="bg-[#0A1128] border border-red-500/20 p-4 rounded-lg shadow-xl relative overflow-hidden">
                    <div className="text-gray-500 text-[8px] tracking-[0.2em] mb-1">SYSTEM_THREAT_LEVEL</div>
                    <div className="text-2xl font-black text-red-500">{lockedDevices}</div>
                    <div className="text-[10px] text-red-400/60 mt-2 italic font-black">Active Hardware Locks</div>
                    <div className="absolute -right-2 -bottom-2 opacity-5 text-4xl italic">🔒</div>
                </div>

                <div className="bg-[#0A1128] border border-orange-500/20 p-4 rounded-lg shadow-xl relative overflow-hidden">
                    <div className="text-gray-500 text-[8px] tracking-[0.2em] mb-1">MARKETING_EFFICIENCY</div>
                    <div className="text-2xl font-black text-orange-400">{achievementPct}%</div>
                    <div className="text-[10px] text-gray-500 mt-2 italic font-black">Target Achievement</div>
                    <div className="absolute -right-2 -bottom-2 opacity-5 text-4xl italic">📈</div>
                </div>
            </div>

            {/* 1. MARKETING (SHRUNK HEIGHT) */}
            <div className="flex flex-col flex-shrink-0 gap-3 bg-[#0A1128] p-4 rounded-xl border border-[#273A60] shadow-lg">
                <div className="flex flex-col md:flex-row gap-4 h-48">
                    {/* Graph */}
                    <div className="w-full md:w-2/3 h-full bg-[#050A15] border border-[#162447] rounded-lg p-2 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTargetHome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorAchieveHome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6}/>
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#162447" vertical={false} />
                                <XAxis dataKey="name" stroke="#6b7280" tick={{fontSize: 8}} axisLine={false} tickLine={false} />
                                <YAxis stroke="#6b7280" tick={{fontSize: 8}} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{backgroundColor: '#0A1128', borderColor: '#273A60', fontSize: '9px', color: '#fff'}} />
                                <Area type="monotone" dataKey="Target" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorTargetHome)" />
                                <Area type="monotone" dataKey="Achievement" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorAchieveHome)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Stats */}
                    <div className="w-full md:w-1/3 flex flex-col gap-2">
                        <div className="bg-[#050A15] p-3 rounded-lg border border-[#162447] flex-1 flex flex-col justify-center">
                            <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Target Units</p>
                            <h3 className="text-xl font-black text-[#10b981]">{totalTarget.toLocaleString()}</h3>
                        </div>
                        <div className="bg-[#050A15] p-3 rounded-lg border border-[#162447] flex-1 flex flex-col justify-center">
                            <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Achievement Units</p>
                            <h3 className="text-xl font-black text-[#f43f5e]">{totalAchievement.toLocaleString()}</h3>
                        </div>
                        <div className="bg-[#050A15] p-3 rounded-lg border border-[#162447] flex-1 flex flex-col justify-center">
                            <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">% of Achievement</p>
                            <h3 className="text-xl font-black text-white">{achievementPct}%</h3>
                        </div>
                    </div>
                </div>

                {/* 🚀 NEW: 2-Line Dynamic Graph Filters */}
                <div className="flex flex-col gap-2 mt-2">
                    <div className="flex flex-wrap gap-2">
                        <FilterButton label="Last Day" active={timeFilter === 'LAST_DAY' && monthFilter === 'ALL'} onClick={() => {setTimeFilter('LAST_DAY'); setMonthFilter('ALL');}} />
                        <FilterButton label="Last 7 Days" active={timeFilter === 'LAST_7_DAYS' && monthFilter === 'ALL'} onClick={() => {setTimeFilter('LAST_7_DAYS'); setMonthFilter('ALL');}} />
                        <FilterButton label="Last 15 Days" active={timeFilter === 'LAST_15_DAYS' && monthFilter === 'ALL'} onClick={() => {setTimeFilter('LAST_15_DAYS'); setMonthFilter('ALL');}} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {MONTHS.map((m, i) => (
                            <FilterButton key={m} label={m} active={monthFilter === String(i)} onClick={() => {setMonthFilter(String(i)); setTimeFilter('ALL');}} />
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. FINANCE & DEVICES PACKED ROW */}
            <div className="flex flex-col lg:flex-row gap-4 flex-shrink-0">

                {/* FINANCE COLUMN */}
                <div className="w-full lg:w-5/12 flex flex-col gap-3 bg-[#0A1128] p-4 rounded-xl border border-[#273A60] shadow-lg">
                    <div className="flex gap-3 h-24">
                        <div className="bg-[#022c22]/30 p-4 rounded-lg border border-[#059669]/50 flex-1 flex flex-col justify-center items-center relative overflow-hidden">
                            <div className="absolute top-0 w-full h-1 bg-[#10b981]"></div>
                            <p className="text-[9px] text-[#34d399] tracking-widest mb-2 font-black">Total Income</p>
                            <h3 className="text-2xl font-black text-white tracking-tighter">৳{income.toLocaleString()}</h3>
                        </div>
                        <div className="bg-[#4c0519]/30 p-4 rounded-lg border border-[#e11d48]/50 flex-1 flex flex-col justify-center items-center relative overflow-hidden">
                            <div className="absolute top-0 w-full h-1 bg-[#f43f5e]"></div>
                            <p className="text-[9px] text-[#fb7185] tracking-widest mb-2 font-black">Total Expense</p>
                            <h3 className="text-2xl font-black text-white tracking-tighter">৳{expense.toLocaleString()}</h3>
                        </div>
                    </div>
                    {/* Finance Filters */}
                    <div className="flex justify-center gap-2">
                        <FilterButton label="Last Week" active={financeFilter === 'week'} onClick={() => setFinanceFilter('week')} />
                        <FilterButton label="Last 15 Days" active={financeFilter === '15days'} onClick={() => setFinanceFilter('15days')} />
                        <FilterButton label="Last Month" active={financeFilter === 'month'} onClick={() => setFinanceFilter('month')} />
                    </div>
                </div>

                {/* DEVICE COLUMN */}
                <div className="w-full lg:w-7/12 flex flex-col gap-3 bg-[#0A1128] p-4 rounded-xl border border-[#273A60] shadow-lg">
                    <p className="text-[9px] text-gray-500 font-black tracking-widest uppercase">Global Device Telemetry</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-24">
                        <div className="bg-[#050A15] p-3 rounded-lg border border-green-500/30 flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute left-0 top-0 h-full w-1 bg-green-500"></div>
                            <div className="flex items-center gap-2 mb-1"><span className="text-green-500 text-[10px]">✔</span><p className="text-[8px] text-gray-500 tracking-widest">Active</p></div>
                            <h3 className="text-xl font-black text-green-400">{activeDevices}</h3>
                        </div>
                        <div className="bg-[#050A15] p-3 rounded-lg border border-red-500/30 flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute left-0 top-0 h-full w-1 bg-red-500"></div>
                            <div className="flex items-center gap-2 mb-1"><span className="text-red-500 text-[10px]">🔒</span><p className="text-[8px] text-gray-500 tracking-widest">Locked</p></div>
                            <h3 className="text-xl font-black text-red-400">{lockedDevices}</h3>
                        </div>
                        <div className="bg-[#050A15] p-3 rounded-lg border border-blue-500/30 flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute left-0 top-0 h-full w-1 bg-blue-500"></div>
                            <div className="flex items-center gap-2 mb-1"><span className="text-blue-500 text-[10px]">🔓</span><p className="text-[8px] text-gray-500 tracking-widest">Unlocked</p></div>
                            <h3 className="text-xl font-black text-blue-400">{unlockedDevices}</h3>
                        </div>
                        <div className="bg-[#050A15] p-3 rounded-lg border border-orange-500/30 flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute left-0 top-0 h-full w-1 bg-orange-500"></div>
                            <div className="flex items-center gap-2 mb-1"><span className="text-orange-500 text-[10px]">🗑</span><p className="text-[8px] text-gray-500 tracking-widest">Uninstall</p></div>
                            <h3 className="text-xl font-black text-orange-400">{uninstalledDevices}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CRITICAL ALERT FOOTER --- */}
            {lostSignals > 0 && (
                <div className="mt-auto bg-red-950/20 border border-red-900/50 p-2 rounded text-[8px] text-red-500 text-center animate-pulse tracking-widest font-black uppercase">
                    SYSTEM_ALERT: {lostSignals} NODES HAVE NOT SENT HEARTBEAT IN &gt; 120 MINUTES
                </div>
            )}

        </div>
    );
};

export default HomeDashboard;