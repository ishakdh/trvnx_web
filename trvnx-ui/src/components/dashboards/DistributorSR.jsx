import React, { useState } from 'react';
import CreateOperator from './CreateOperator.jsx';

const DistributorSR = ({
                           activeTab, handleCreateDistributor, distFormData, setDistFormData, allDivisions,
                           currentDistricts, currentThanas, marketAreaThanas, commStartDate, setCommStartDate,
                           commEndDate, setCommEndDate, financeLedger, setFinanceLedger, fetchData, validUsers,
                           toggleUserLock, setUsers, viewCommModal, setViewCommModal,
                           generateCommissionPDF, viewDistModal, setViewDistModal
                       }) => {

    const [isEditingDist, setIsEditingDist] = useState(false);
    const [editDistData, setEditDistData] = useState({});

    const handleUpdateDistributor = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`http://localhost:5000/api/auth/update/${editDistData._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify(editDistData)
            });
            if (res.ok) {
                alert("✅ PROFILE UPDATED SUCCESSFULLY.");
                setViewDistModal({isOpen: false, dist: null});
                setIsEditingDist(false);
                fetchData('auth/operators', setUsers);
            } else {
                alert("❌ UPDATE FAILED.");
            }
        } catch (err) { alert("⚠️ SYSTEM OFFLINE."); }
    };

    // 🚀 NEW: Mirror Protocol Function
    const handleMirror = async (targetId) => {
        if (!window.confirm("⚠️ INITIATE MIRROR PROTOCOL? You will take full control of this identity.")) return;

        try {
            const res = await fetch('http://localhost:5000/api/admin/mirror-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify({ targetUserId: targetId })
            });

            if (res.ok) {
                const data = await res.json();

                // Safely backup Admin Brain
                localStorage.setItem('original_admin_token', localStorage.getItem('trvnx_token'));
                localStorage.setItem('original_admin_user', localStorage.getItem('trvnx_user'));

                // Inject Target Brain
                localStorage.setItem('trvnx_token', data.token);
                localStorage.setItem('trvnx_user', JSON.stringify(data.user));

                // Hard reboot the system into new identity
                window.location.reload();
            } else {
                alert("❌ MIRROR PROTOCOL FAILED. Target identity locked.");
            }
        } catch (err) { alert("⚠️ SYSTEM OFFLINE."); }
    };

    const filteredSRTx = financeLedger.filter(tx => {
        const isSRType = ['SR_COMMISSION', 'SR_PAYOUT', 'COMMISSION'].includes(tx.type) && tx.userId?.role === 'SR';
        if (!isSRType) return false;

        const txDate = new Date(tx.createdAt || tx.date).setHours(0,0,0,0);
        const start = commStartDate ? new Date(commStartDate).setHours(0,0,0,0) : null;
        const end = commEndDate ? new Date(commEndDate).setHours(23,59,59,999) : null;

        if (start && end) return txDate >= start && txDate <= end;
        if (start) return txDate >= start;
        if (end) return txDate <= end;
        return true;
    });

    const totalSREarnings = filteredSRTx.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    return (
        <>
            {activeTab === 'dist_create' && (
                <CreateOperator
                    handleCreateDistributor={handleCreateDistributor} distFormData={distFormData} setDistFormData={setDistFormData}
                    allDivisions={allDivisions} currentDistricts={currentDistricts} currentThanas={currentThanas} marketAreaThanas={marketAreaThanas}
                />
            )}

            {activeTab === 'dist_ac' && (
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-center bg-[#0A1128] p-4 rounded border border-[#273A60] gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="flex flex-col">
                                <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">From Date</label>
                                <input type="date" className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-indigo-300 outline-none uppercase font-bold" value={commStartDate} onChange={(e) => setCommStartDate(e.target.value)} />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">To Date</label>
                                <input type="date" className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-indigo-300 outline-none uppercase font-bold" value={commEndDate} onChange={(e) => setCommEndDate(e.target.value)} />
                            </div>
                            <div className="flex flex-col justify-end mt-4">
                                <button onClick={() => { setCommStartDate(''); setCommEndDate(''); }} className="bg-gray-800 text-gray-400 hover:text-white px-3 py-2 rounded text-[9px] font-black tracking-widest transition-colors uppercase">Clear Filter</button>
                            </div>
                        </div>
                        <div className="bg-indigo-900/20 border border-indigo-500/30 px-6 py-3 rounded text-right w-full md:w-auto shadow-lg">
                            <div className="text-[8px] text-indigo-400 font-bold uppercase tracking-[0.2em] mb-1">Total Liability</div>
                            <div className="text-xl text-white font-black tracking-tighter font-mono">
                                ৳{financeLedger.filter(tx => tx.type === 'COMMISSION' && tx.userId?.role !== 'SR' && (!commStartDate || new Date(tx.createdAt).setHours(0,0,0,0) >= new Date(commStartDate).setHours(0,0,0,0)) && (!commEndDate || new Date(tx.createdAt).setHours(0,0,0,0) <= new Date(commEndDate).setHours(23,59,59,999))).reduce((sum, tx) => sum + Number(tx.amount || 0), 0).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl uppercase">
                        <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-300 font-black">Distributor A/C Ledger (Income Breakdown)</h3>
                            <button onClick={() => fetchData('admin/finance-ledger', setFinanceLedger)} className="text-[9px] bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/30 hover:bg-indigo-500/40 transition-all font-black uppercase tracking-widest">↻ SYNC_DATA</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase font-bold">
                                <thead className="bg-[#050A15] text-gray-500 tracking-widest font-black">
                                <tr>
                                    <th className="p-5">No</th>
                                    <th className="p-5">Date</th>
                                    <th className="p-5">ID No</th>
                                    <th className="p-5">Distributor Name</th>
                                    <th className="p-5">Description</th>
                                    <th className="p-5 text-right">Amount</th>
                                    <th className="p-5 text-center">Status</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-[#162447]">
                                {financeLedger.filter(tx => tx.type === 'COMMISSION' && tx.userId?.role !== 'SR').filter(tx => {
                                    if (!commStartDate && !commEndDate) return true;
                                    const txDate = new Date(tx.createdAt || tx.date).setHours(0,0,0,0);
                                    const start = commStartDate ? new Date(commStartDate).setHours(0,0,0,0) : null;
                                    const end = commEndDate ? new Date(commEndDate).setHours(23,59,59,999) : null;
                                    if (start && end) return txDate >= start && txDate <= end;
                                    if (start) return txDate >= start;
                                    if (end) return txDate <= end;
                                    return true;
                                }).map((tx, idx) => (
                                    <tr key={tx._id || idx} className="hover:bg-indigo-900/5 transition-colors font-bold">
                                        <td className="p-5 text-gray-600">{idx + 1}</td>
                                        <td className="p-5 text-gray-400">{new Date(tx.createdAt || tx.date).toLocaleDateString('en-GB')}</td>
                                        <td className="p-5 text-blue-400 font-mono">{tx.userId?._id ? String(tx.userId._id).slice(-6).toUpperCase() : 'N/A'}</td>
                                        <td className="p-5 text-white text-xs">{tx.userId?.name || 'N/A'}</td>
                                        <td className="p-5 text-gray-300 italic">{tx.remarks || tx.description || 'Distributor Commission'}</td>
                                        <td className="p-5 text-right text-green-400 font-mono text-xs font-black">৳{tx.amount}</td>
                                        <td className="p-5 text-center text-green-500 font-black">SUCCESS</td>
                                    </tr>
                                ))}
                                {financeLedger.filter(tx => tx.type === 'COMMISSION' && tx.userId?.role !== 'SR').length === 0 && (
                                    <tr><td colSpan="7" className="p-8 text-center text-gray-600 text-xs italic tracking-widest font-bold">No distributor commission records found for this period.</td></tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'dist_details' && (
                <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl uppercase">
                    <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-300">Global Distributor Matrix</h3>
                        <button onClick={() => fetchData('auth/operators', setUsers)} className="text-[9px] bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/30 hover:bg-indigo-500/40 transition-all font-black uppercase tracking-widest">↻ SYNC_DATA</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase">
                            <thead className="bg-[#050A15] text-gray-500 tracking-widest font-bold">
                            <tr>
                                <th className="p-5">Distributor ID</th>
                                <th className="p-5">Operator Name / Business</th>
                                <th className="p-5 text-center">Parents</th>
                                <th className="p-5 text-center">Contacts</th>
                                <th className="p-5">Market Coverage / Area</th>
                                <th className="p-5">Comm A/B</th>
                                <th className="p-5 text-right">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-[#162447]">
                            {validUsers.filter(u => u.role === 'DISTRIBUTOR').map(u => (
                                <tr key={u._id} className="hover:bg-indigo-900/5 transition-colors font-bold">
                                    <td className="p-5 text-blue-400 font-mono">{String(u._id).slice(-6).toUpperCase()}</td>
                                    <td className="p-5">
                                        <div className="text-white text-xs">{u.name}</div>
                                        <div className="text-indigo-500 font-black mt-1 text-[7px] tracking-widest">{u.business_name || 'TRVNX_OPERATOR'}</div>
                                    </td>
                                    <td className="p-5 text-gray-400 text-center">
                                        <div>F: {u.father_name || 'N/A'}</div>
                                        <div className="mt-1">M: {u.mother_name || 'N/A'}</div>
                                    </td>
                                    <td className="p-5 text-indigo-300 text-center font-mono">
                                        <div>{u.phone}</div>
                                        <div className="text-[7px] text-gray-600 mt-1 uppercase">{u.phone_alt || 'NO_SECONDARY'}</div>
                                    </td>
                                    <td className="p-5">
                                        <div className="text-gray-300">{u.territory?.district || 'GLOBAL'}</div>
                                        <div className="text-teal-500 text-[8px] mt-1 italic uppercase tracking-tighter">{u.market_area?.market_name || 'ALL_MARKETS'}</div>
                                    </td>
                                    <td className="p-5">
                                        <div className="text-green-500 font-black tracking-tighter text-[10px]">A: ৳{u.commissions?.per_user || 0}</div>
                                        <div className="text-blue-500 font-black tracking-tighter text-[10px] mt-1">B: ৳{u.commissions?.per_license || 0}</div>
                                    </td>
                                    <td className="p-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* 🚀 NEW: Mirror Button Added Here */}
                                            <button onClick={() => handleMirror(u._id)} className="bg-purple-900/40 border border-purple-900/50 text-purple-400 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded text-[8px] transition-all font-black uppercase">MIRROR</button>
                                            <button onClick={() => { setViewDistModal({isOpen: true, dist: u}); setIsEditingDist(false); setEditDistData(u); }} className="bg-transparent border border-[#273A60] text-gray-300 px-3 py-1.5 rounded text-[8px] hover:bg-gray-800 transition-all font-black uppercase">VIEW</button>
                                            <button onClick={() => toggleUserLock(u._id, u.status || 'ACTIVE')} className={`px-4 py-1.5 rounded text-[8px] font-black tracking-widest transition-all ${u.status === 'LOCKED' ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg' : 'bg-red-900/40 text-red-500 border border-red-900/50 hover:bg-red-600 hover:text-white'}`}>
                                                {u.status === 'LOCKED' ? 'UNLOCK_ID' : 'LOCK_ID'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {validUsers.filter(u => u.role === 'DISTRIBUTOR').length === 0 && (
                                <tr><td colSpan="7" className="p-8 text-center text-gray-600 text-xs italic tracking-widest">No active distributors detected in nodes.</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'sr_details' && (
                <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl uppercase">
                    <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-300">Global SR Matrix</h3>
                        <button onClick={() => fetchData('auth/operators', setUsers)} className="text-[9px] bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/30 hover:bg-indigo-500/40 transition-all font-black uppercase tracking-widest">↻ SYNC_DATA</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase">
                            <thead className="bg-[#050A15] text-gray-500 tracking-widest font-bold">
                            <tr>
                                <th className="p-5">ID No</th>
                                <th className="p-5">Name (SR Name)</th>
                                <th className="p-5 text-center">Parent</th>
                                <th className="p-5 text-center">Contact</th>
                                <th className="p-5">Distributor</th>
                                <th className="p-5">Comm A/B & Salary</th>
                                <th className="p-5 text-right">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-[#162447]">
                            {validUsers.filter(u => u.role === 'SR').map(u => {
                                const dist = validUsers.find(d => d._id === u.parent_id);
                                return (
                                    <tr key={u._id} className="hover:bg-indigo-900/5 transition-colors font-bold">
                                        <td className="p-5 text-blue-400 font-mono">{String(u._id).slice(-6).toUpperCase()}</td>
                                        <td className="p-5 text-white text-xs">{u.name}</td>
                                        <td className="p-5 text-gray-400 text-center">
                                            <div>F: {u.father_name || 'N/A'}</div>
                                            <div className="mt-1">M: {u.mother_name || 'N/A'}</div>
                                        </td>
                                        <td className="p-5 text-indigo-300 text-center font-mono">{u.phone}</td>
                                        <td className="p-5 text-gray-300">{dist ? dist.name : 'DIRECT/SYS'}</td>
                                        <td className="p-5">
                                            <div className="text-green-500 font-black tracking-tighter text-[10px]">A: ৳{u.commissions?.per_user || 0}</div>
                                            <div className="text-blue-500 font-black tracking-tighter text-[10px] mt-1">B: ৳{u.commissions?.per_license || 0}</div>
                                            <div className="text-yellow-500 font-black tracking-tighter text-[10px] mt-1">S: ৳{u.commissions?.salary || 0}</div>
                                        </td>
                                        <td className="p-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                {/* 🚀 NEW: Mirror Button Added Here */}
                                                <button onClick={() => handleMirror(u._id)} className="bg-purple-900/40 border border-purple-900/50 text-purple-400 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded text-[8px] transition-all font-black uppercase">MIRROR</button>
                                                <button onClick={() => { setViewDistModal({isOpen: true, dist: u}); setIsEditingDist(false); setEditDistData(u); }} className="bg-transparent border border-[#273A60] text-gray-300 px-3 py-1.5 rounded text-[8px] hover:bg-gray-800 transition-all font-black uppercase">VIEW</button>
                                                <button onClick={() => toggleUserLock(u._id, u.status || 'ACTIVE')} className={`px-4 py-1.5 rounded text-[8px] font-black tracking-widest transition-all ${u.status === 'LOCKED' ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg' : 'bg-red-900/40 text-red-500 border border-red-900/50 hover:bg-red-600 hover:text-white'}`}>
                                                    {u.status === 'LOCKED' ? 'UNLOCK' : 'LOCK'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {validUsers.filter(u => u.role === 'SR').length === 0 && (
                                <tr><td colSpan="7" className="p-8 text-center text-gray-600 text-xs italic tracking-widest">No active SRs detected in nodes.</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'sr_ac' && (
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-center bg-[#0A1128] p-4 rounded border border-[#273A60] gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="flex flex-col">
                                <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">From Date</label>
                                <input type="date" className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-indigo-300 outline-none uppercase font-bold" value={commStartDate} onChange={(e) => setCommStartDate(e.target.value)} />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">To Date</label>
                                <input type="date" className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-indigo-300 outline-none uppercase font-bold" value={commEndDate} onChange={(e) => setCommEndDate(e.target.value)} />
                            </div>
                            <div className="flex flex-col justify-end mt-4">
                                <button onClick={() => { setCommStartDate(''); setCommEndDate(''); }} className="bg-gray-800 text-gray-400 hover:text-white px-3 py-2 rounded text-[9px] font-black tracking-widest transition-colors uppercase">Clear Filter</button>
                            </div>
                        </div>
                        <div className="bg-indigo-900/20 border border-indigo-500/30 px-6 py-3 rounded text-right w-full md:w-auto shadow-lg">
                            <div className="text-[8px] text-indigo-400 font-bold uppercase tracking-[0.2em] mb-1">Total SR Earnings</div>
                            <div className="text-xl text-white font-black tracking-tighter font-mono">
                                ৳{totalSREarnings.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl uppercase">
                        <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-300 font-black">SR Earnings Ledger (Income breakdown)</h3>
                            <button onClick={() => fetchData('admin/finance-ledger', setFinanceLedger)} className="text-[9px] bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/30 hover:bg-indigo-500/40 transition-all font-black uppercase tracking-widest">↻ SYNC_DATA</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase font-bold">
                                <thead className="bg-[#050A15] text-gray-500 tracking-widest font-black">
                                <tr>
                                    <th className="p-5">No</th>
                                    <th className="p-5">ID No</th>
                                    <th className="p-5">Distributor Name</th>
                                    <th className="p-5">Name</th>
                                    <th className="p-5 text-right">Amount</th>
                                    <th className="p-5 text-center">Status</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-[#162447]">
                                {filteredSRTx.map((tx, idx) => {
                                    const srUser = validUsers.find(u => String(u._id) === String(tx.userId?._id || tx.userId));
                                    return (
                                        <tr key={tx._id || idx} className="hover:bg-indigo-900/5 transition-colors font-bold">
                                            <td className="p-5 text-gray-600">{idx + 1}</td>
                                            <td className="p-5 text-blue-400 font-mono">
                                                {srUser?._id ? String(srUser._id).slice(-6).toUpperCase() : 'N/A'}
                                            </td>
                                            <td className="p-5 text-white">{srUser?.name || tx.userId?.name || 'N/A'}</td>
                                            <td className="p-5 text-gray-400 italic">{tx.remarks || tx.description || tx.type}</td>
                                            <td className="p-5 text-right text-green-400 font-mono text-xs font-black">৳{tx.amount}</td>
                                            <td className="p-5 text-center text-yellow-500 font-black">{tx.status}</td>
                                        </tr>
                                    );
                                })}
                                {filteredSRTx.length === 0 && (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-600 text-xs italic tracking-widest font-bold">No SR ledger records found.</td></tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {viewCommModal.isOpen && viewCommModal.dist && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[140] uppercase font-black tracking-widest">
                    <div className="bg-[#0A1128] border border-blue-500/30 rounded-xl w-full max-w-4xl p-8 shadow-2xl relative max-h-[90vh] flex flex-col font-mono uppercase">
                        <button onClick={() => setViewCommModal({isOpen: false, dist: null, details: []})} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 font-black text-xl">✕</button>

                        <div className="mb-6 border-b border-[#273A60] pb-4 flex justify-between items-end shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-white mb-1 tracking-widest uppercase">{viewCommModal.dist.name}</h2>
                                <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest font-mono">ID: {viewCommModal.dist._id}</div>
                            </div>
                            <button onClick={generateCommissionPDF} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded text-[9px] font-black tracking-widest shadow-lg transition-all flex items-center gap-2">
                                📄 DOWNLOAD STATEMENT
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase font-bold">
                                <thead className="bg-[#050A15] text-gray-500 tracking-widest sticky top-0 z-10 font-black">
                                <tr>
                                    <th className="p-4">No</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Shop ID</th>
                                    <th className="p-4">Shop Name</th>
                                    <th className="p-4">Description</th>
                                    <th className="p-4 text-right">Amount</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-[#273A60]">
                                {viewCommModal.details.map((detail, idx) => (
                                    <tr key={idx} className="hover:bg-[#111A35] transition-colors font-bold">
                                        <td className="p-4 text-gray-600">{idx + 1}</td>
                                        <td className="p-4 text-gray-400">{new Date(detail.date).toLocaleDateString('en-GB')}</td>
                                        <td className="p-4 text-blue-400 font-mono">{detail.shop_id}</td>
                                        <td className="p-4 text-gray-300">{detail.shop_name}</td>
                                        <td className="p-4 text-gray-300 italic">{detail.description}</td>
                                        <td className="p-4 text-right text-green-400 font-mono font-black">৳{detail.amount}</td>
                                    </tr>
                                ))}
                                {viewCommModal.details.length === 0 && (
                                    <tr><td col colSpan="6" className="p-8 text-center text-gray-600 text-xs italic tracking-widest font-bold">No detailed records found.</td></tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {viewDistModal?.isOpen && viewDistModal?.dist && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[200]">
                    <div className="bg-[#111A35] border border-[#273A60] rounded-xl p-8 max-w-2xl w-full shadow-2xl relative uppercase font-bold text-[10px]">
                        <button onClick={() => setViewDistModal({ isOpen: false, dist: null })} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl font-black">✕</button>

                        <div className="flex justify-between items-center mb-6 border-b border-[#273A60] pb-4">
                            <h3 className="text-xl font-black uppercase text-blue-400 tracking-widest">{viewDistModal.dist.role} PROFILE</h3>
                            {!isEditingDist && (
                                <button onClick={() => setIsEditingDist(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-[9px] font-black tracking-widest shadow-lg transition-all">EDIT PROFILE</button>
                            )}
                        </div>

                        {!isEditingDist ? (
                            <div className="grid grid-cols-2 gap-4 text-white">
                                <div>
                                    <span className="text-gray-500 block mb-1 tracking-widest">Full Name</span>
                                    <div className="bg-[#0A1128] p-3 rounded border border-[#273A60]">{viewDistModal.dist.name || 'N/A'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-1 tracking-widest">Business / Operator Name</span>
                                    <div className="bg-[#0A1128] p-3 rounded border border-[#273A60]">{viewDistModal.dist.business_name || 'N/A'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-1 tracking-widest">Phone Number</span>
                                    <div className="bg-[#0A1128] p-3 rounded border border-[#273A60] font-mono">{viewDistModal.dist.phone || 'N/A'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-1 tracking-widest">Alternate Phone</span>
                                    <div className="bg-[#0A1128] p-3 rounded border border-[#273A60] font-mono">{viewDistModal.dist.phone_alt || 'N/A'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-1 tracking-widest">Father's Name</span>
                                    <div className="bg-[#0A1128] p-3 rounded border border-[#273A60]">{viewDistModal.dist.father_name || 'N/A'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-1 tracking-widest">Mother's Name</span>
                                    <div className="bg-[#0A1128] p-3 rounded border border-[#273A60]">{viewDistModal.dist.mother_name || 'N/A'}</div>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-gray-500 block mb-1 tracking-widest">Full Address</span>
                                    <div className="bg-[#0A1128] p-3 rounded border border-[#273A60]">
                                        {viewDistModal.dist.address ? `${viewDistModal.dist.address.line1 || ''} ${viewDistModal.dist.address.line2 || ''}, ${viewDistModal.dist.address.thana || ''}, ${viewDistModal.dist.address.district || ''}, ${viewDistModal.dist.address.division || ''}` : 'N/A'}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-gray-500 block mb-1 tracking-widest">Market Coverage / Territory</span>
                                    <div className="bg-[#0A1128] p-3 rounded border border-[#273A60]">
                                        <span className="text-blue-300">{viewDistModal.dist.territory?.district || 'GLOBAL'}</span> - <span className="text-teal-300">{viewDistModal.dist.market_area?.market_name || 'ALL MARKETS'}</span>
                                        <div className="text-[8px] text-gray-400 mt-2 font-mono">
                                            Districts: {viewDistModal.dist.market_area?.districts?.join(', ') || 'N/A'} <br/>
                                            Thanas: {viewDistModal.dist.market_area?.thanas?.join(', ') || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-1 tracking-widest">Commissions Matrix</span>
                                    <div className="bg-[#0A1128] p-3 rounded border border-[#273A60] text-green-400 font-mono">
                                        A: ৳{viewDistModal.dist.commissions?.per_user || 0} | B: ৳{viewDistModal.dist.commissions?.per_license || 0}
                                        {viewDistModal.dist.role === 'SR' && ` | S: ৳${viewDistModal.dist.commissions?.salary || 0}`}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-1 tracking-widest">Account Status</span>
                                    <div className={`bg-[#0A1128] p-3 rounded border border-[#273A60] font-black ${viewDistModal.dist.status === 'LOCKED' ? 'text-red-500' : 'text-green-500'}`}>
                                        {viewDistModal.dist.status || 'ACTIVE'}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleUpdateDistributor} className="grid grid-cols-2 gap-4 text-white">
                                <div className="flex flex-col">
                                    <label className="text-gray-500 mb-1 tracking-widest">Full Name</label>
                                    <input type="text" value={editDistData.name || ''} onChange={e => setEditDistData({...editDistData, name: e.target.value})} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none rounded" required />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-gray-500 mb-1 tracking-widest">Business / Operator Name</label>
                                    <input type="text" value={editDistData.business_name || ''} onChange={e => setEditDistData({...editDistData, business_name: e.target.value})} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none rounded" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-gray-500 mb-1 tracking-widest">Phone Number</label>
                                    <input type="text" value={editDistData.phone || ''} onChange={e => setEditDistData({...editDistData, phone: e.target.value})} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none rounded font-mono" required />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-gray-500 mb-1 tracking-widest">Status</label>
                                    <select value={editDistData.status || 'ACTIVE'} onChange={e => setEditDistData({...editDistData, status: e.target.value})} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none rounded">
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="LOCKED">LOCKED</option>
                                    </select>
                                </div>
                                <div className="col-span-2 flex flex-col">
                                    <label className="text-gray-500 mb-1 tracking-widest">Address Line 1</label>
                                    <input type="text" value={editDistData.address?.line1 || ''} onChange={e => setEditDistData({...editDistData, address: {...editDistData.address, line1: e.target.value}})} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none rounded" />
                                </div>
                                <div className="col-span-2 flex gap-4 mt-4">
                                    <button type="button" onClick={() => setIsEditingDist(false)} className="flex-1 py-3 border border-[#273A60] text-gray-500 font-black text-[10px] hover:text-white transition-all uppercase tracking-widest">CANCEL</button>
                                    <button type="submit" className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-black text-[10px] shadow-lg transition-all uppercase tracking-widest">SAVE CHANGES</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default DistributorSR;