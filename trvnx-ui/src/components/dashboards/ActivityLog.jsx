import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const ActivityLog = ({ logs, onRefresh }) => {
    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // 🚀 FIXED: Converts numbered objects {"0": {...}} into a proper array
    let safeLogs = [];
    if (Array.isArray(logs)) {
        safeLogs = logs;
    } else if (logs && typeof logs === 'object') {
        safeLogs = Object.values(logs).filter(item => item && item._id);
    }

    // GET UNIQUE LIST OF USERS FROM LOGS FOR THE DROPDOWN
    const uniqueUsers = [...new Set(safeLogs.map(log => log.performed_by?.name))].filter(Boolean).sort();

    // MULTI-LAYER FILTER LOGIC
    const filteredLogs = safeLogs.filter(log => {
        const search = searchTerm.toLowerCase();
        const logDate = new Date(log.createdAt).setHours(0, 0, 0, 0);

        const matchesSearch = !searchTerm ||
            log.action_type?.toLowerCase().includes(search) ||
            log.reason?.toLowerCase().includes(search) ||
            log.target_imei?.includes(search);

        const matchesUser = !selectedUser || log.performed_by?.name === selectedUser;

        const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
        const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

        let matchesDate = true;
        if (start && end) matchesDate = logDate >= start && logDate <= end;
        else if (start) matchesDate = logDate >= start;
        else if (end) matchesDate = logDate <= end;

        return matchesSearch && matchesUser && matchesDate;
    });

    // 🚀 NEW: PDF GENERATOR FUNCTION
    const generateAuditPDF = () => {
        if (filteredLogs.length === 0) return alert("No logs to export.");

        const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });

        // Header Background
        doc.setFillColor(10, 17, 40);
        doc.rect(0, 0, 297, 40, 'F');

        // Title
        doc.setTextColor(33, 150, 243);
        doc.setFontSize(20);
        doc.text("MASTER ACTIVITY AUDIT REPORT", 15, 20);

        // Metadata
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text(`Generated On: ${new Date().toLocaleString()}`, 15, 28);
        doc.text(`Filters: User: ${selectedUser || 'ALL'} | Range: ${startDate || 'Start'} to ${endDate || 'End'}`, 15, 33);

        const tableBody = filteredLogs.map((log, index) => [
            index + 1,
            new Date(log.createdAt).toLocaleString(),
            log.performed_by?.name || 'SYSTEM',
            log.performed_by?.role || 'CORE',
            log.action_type,
            log.target_imei || (log.target_id ? String(log.target_id).slice(-6).toUpperCase() : 'N/A'),

            // 🚀 FIXED: Replaces the '৳' symbol with 'BDT ' so the PDF doesn't break the layout
            (log.reason || '').replace(/৳/g, 'BDT ')
        ]);

        autoTable(doc, {
            startY: 45,
            head: [['#', 'TIMESTAMP', 'PERFORMER', 'ROLE', 'ACTION', 'TARGET', 'DESCRIPTION']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [33, 150, 243], fontSize: 8, fontStyle: 'bold' },
            bodyStyles: { fontSize: 7 },
            columnStyles: {
                6: { cellWidth: 80 } // Forces the description column to stay within bounds
            },
            styles: { overflow: 'linebreak' } // 🚀 FIXED: Forces the text to drop to the next line instead of overflowing
        });

        doc.save(`Activity_Log_${new Date().getTime()}.pdf`);
    };

    return (
        <div className="space-y-4 font-mono uppercase">

            {/* ADVANCED FILTER PANEL */}
            <div className="bg-[#0A1128] p-6 rounded border border-[#273A60] shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

                    <div className="flex flex-col space-y-2">
                        <label className="text-[8px] text-gray-500 font-black tracking-widest ml-1">GENERAL SEARCH</label>
                        <div className="flex items-center bg-[#050A15] border border-[#273A60] px-3 py-2 rounded">
                            <span className="text-gray-500 mr-2">🔍</span>
                            <input type="text" placeholder="ACTION / IMEI / REASON..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-700 font-bold w-full" />
                        </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                        <label className="text-[8px] text-gray-500 font-black tracking-widest ml-1">SELECT USER</label>
                        <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-blue-400 outline-none rounded font-bold cursor-pointer">
                            <option value="">ALL USERS</option>
                            {uniqueUsers.map(user => <option key={user} value={user}>{user}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col space-y-2">
                        <label className="text-[8px] text-gray-500 font-black tracking-widest ml-1">FROM DATE</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-blue-300 outline-none rounded font-bold"/>
                    </div>

                    <div className="flex flex-col space-y-2">
                        <label className="text-[8px] text-gray-500 font-black tracking-widest ml-1">TO DATE</label>
                        <div className="flex gap-2">
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-blue-300 outline-none rounded font-bold flex-1"/>
                            <button onClick={() => {setSearchTerm(''); setSelectedUser(''); setStartDate(''); setEndDate('');}} className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-2 rounded text-[9px] font-black transition-all border border-gray-700">CLEAR</button>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex justify-end gap-3">
                    {/* 🚀 PDF DOWNLOAD BUTTON */}
                    <button
                        onClick={generateAuditPDF}
                        className="text-[9px] bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full shadow-lg transition-all font-black uppercase tracking-widest flex items-center gap-2"
                    >
                        📄 EXPORT PDF REPORT
                    </button>
                    <button onClick={onRefresh} className="text-[9px] bg-blue-500/10 text-blue-400 px-6 py-2 rounded-full border border-blue-500/30 hover:bg-blue-500/20 transition-all font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
                        ↻ SYNC MASTER LOGS
                    </button>
                </div>
            </div>

            {/* LOGS TABLE */}
            <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl">
                <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                    <h3 className="text-xs font-bold tracking-widest text-blue-300 italic">Master Activity Audit Trail</h3>
                    <span className="text-[9px] text-gray-500 font-black">Showing {filteredLogs.length} Records</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[9px] font-bold whitespace-nowrap">
                        <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                        <tr>
                            <th className="p-4 border-r border-[#273A60]/20">Timestamp</th>
                            <th className="p-4 border-r border-[#273A60]/20">User / Performer</th>
                            <th className="p-4 border-r border-[#273A60]/20">Action Type</th>
                            <th className="p-4 border-r border-[#273A60]/20">Target Details</th>
                            <th className="p-4">Reason / Description</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-[#273A60]/50">
                        {filteredLogs.map((log) => (
                            <tr key={log._id} className="hover:bg-[#0A1128] transition-colors font-bold">
                                <td className="p-4 text-gray-400">
                                    {new Date(log.createdAt).toLocaleDateString()}
                                    <div className="text-[7px] text-gray-600 mt-1">{new Date(log.createdAt).toLocaleTimeString()}</div>
                                </td>
                                <td className="p-4">
                                    <div className="text-white">{log.performed_by?.name || 'SYSTEM'}</div>
                                    <div className={`text-[7px] font-black mt-1 ${log.performed_by?.role === 'ADMIN' ? 'text-red-500' : 'text-blue-500'}`}>{log.performed_by?.role || 'CORE'}</div>
                                </td>
                                <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-[8px] border 
    ${log.action_type.includes('LOCK') || log.action_type.includes('REJECT') ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                            log.action_type.includes('SALE') || log.action_type.includes('APPROVE') ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                log.action_type.includes('EMI') || log.action_type.includes('PAYOUT') ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                    log.action_type.includes('UNINSTALL') ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
    {log.action_type}
</span>
                                </td>
                                <td className="p-4">
                                    <div className="text-gray-300 font-mono italic">{log.target_imei ? `IMEI: ${log.target_imei}` : (log.target_id ? `ID: ${String(log.target_id).slice(-6).toUpperCase()}` : 'N/A')}</div>
                                </td>
                                <td className="p-4 text-gray-400 max-w-sm whitespace-normal leading-relaxed">
                                    {log.reason}
                                    <div className="text-gray-600 text-[6px] font-mono mt-1">Node: {log.ip_address || 'Internal'} | Device: {log.device_info || 'Dashboard'}</div>
                                </td>
                            </tr>
                        ))}
                        {filteredLogs.length === 0 && (
                            <tr><td colSpan="5" className="p-12 text-center text-gray-600 italic tracking-[0.2em]">No logs match the selected criteria.</td></tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ActivityLog;