import React from 'react';
import RechargeTerminal from './RechargeTerminal.jsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Finance = ({
                     activeTab, setActiveTab, handleShopRechargeSubmit, rechargeSearchQuery, setRechargeSearchQuery,
                     filteredRechargeShops, rechargeForm, setRechargeForm, isRechargeSearchOpen, setIsRechargeSearchOpen,
                     fetchData, setFinanceLedger, filteredLedger, handleApprovePayout, handleReleasePayout, user,
                     financeSearchTerm, setFinanceSearchTerm, financeStartDate, setFinanceStartDate, financeEndDate, setFinanceEndDate,
                     totalIncome, totalExpense, incomeEntries, expenseEntries,
                     unusedStartDate, setUnusedStartDate, unusedEndDate, setUnusedEndDate, totalUnusedLiability,
                     setUnusedBalanceList, filteredUnused, setViewUnusedModal, viewUnusedModal,
                     financeFormModal, setFinanceFormModal, handleFinanceSubmit
                 }) => {

    const generateFinancePDF = (title, data) => {
        if (!data || data.length === 0) return alert("No data to download for the selected dates.");
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const isExpense = title.includes("Expense");
        doc.setFillColor(10, 17, 40); doc.rect(0, 0, 210, 40, 'F'); doc.setTextColor(isExpense ? 239 : 34, isExpense ? 68 : 197, isExpense ? 68 : 94);
        doc.setFontSize(18); doc.text(`TRVNX_OS ${title.toUpperCase()}`, 15, 20); doc.setTextColor(255, 255, 255); doc.setFontSize(9);
        doc.text(`Date Range: ${financeStartDate || 'All Time'} to ${financeEndDate || 'All Time'}`, 15, 30);
        autoTable(doc, {
            startY: 45, head: [['No', 'Date', 'ID No', 'Name', 'Description', 'Amount']],
            body: data.map((item, index) => [index + 1, new Date(item.createdAt).toLocaleDateString(), (item.userId && item.userId._id ? String(item.userId._id).slice(-6).toUpperCase() : 'SYS'), item.userId?.name || 'ADMIN_ENTRY', item.description || item.type, `BDT ${item.amount}`]),
            theme: 'grid', headStyles: { fillColor: isExpense ? [239, 68, 68] : [34, 197, 94] }
        });
        const total = data.reduce((sum, item) => sum + Number(item.amount), 0);
        doc.setFontSize(12); doc.setTextColor(0, 0, 0); doc.text(`TOTAL ${isExpense ? 'EXPENSE' : 'INCOME'}: BDT ${total.toLocaleString()}`, 15, doc.lastAutoTable.finalY + 10);
        doc.save(`TRVNX_${title.replace(' ', '_')}.pdf`);
    };

    const generateRechargeInvoicePDF = (tx, shop) => {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a5' });
        doc.setFillColor(10, 17, 40); doc.rect(0, 0, 148, 30, 'F'); doc.setTextColor(34, 197, 94); doc.setFontSize(16);
        doc.text("TRVNX_OS RECHARGE INVOICE", 10, 15); doc.setTextColor(255, 255, 255); doc.setFontSize(8);
        doc.text(`Date: ${new Date(tx.createdAt).toLocaleDateString()}`, 10, 22); doc.setTextColor(0, 0, 0); doc.setFontSize(10);
        doc.text("SHOPKEEPER DETAILS", 10, 45); doc.setFontSize(8); doc.text(`Shop Name: ${shop.business_name || 'N/A'}`, 10, 52);
        doc.text(`Owner Name: ${shop.name}`, 10, 57); doc.text(`Phone: ${shop.phone}`, 10, 62); doc.text(`Shop ID: ${shop._id.slice(-6).toUpperCase()}`, 10, 67);
        autoTable(doc, { startY: 80, head: [['Description', 'Payment Method', 'Amount']], body: [['Wallet Recharge', tx.payment_method || 'CASH', `BDT ${tx.amount}`]], theme: 'grid', headStyles: { fillColor: [34, 197, 94] } });
        doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.text("This is a system generated digital invoice.", 74, 190, { align: 'center' });
        doc.save(`Recharge_Invoice_${shop._id.slice(-6)}.pdf`);
    };

    const generateUnusedStatementPDF = () => {
        if (!viewUnusedModal.shop || viewUnusedModal.history.length === 0) return alert("No transactions found.");
        const filteredHistory = viewUnusedModal.history.filter(tx => {
            if (!unusedStartDate && !unusedEndDate) return true;
            const txDateStr = tx.date || tx.createdAt;
            if (!txDateStr) return true;
            const txDate = new Date(txDateStr).setHours(0,0,0,0);
            const start = unusedStartDate ? new Date(unusedStartDate).setHours(0,0,0,0) : null;
            const end = unusedEndDate ? new Date(unusedEndDate).setHours(23,59,59,999) : null;
            if (start && end) return txDate >= start && txDate <= end;
            if (start) return txDate >= start;
            if (end) return txDate <= end;
            return true;
        });
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        doc.setFillColor(10, 17, 40); doc.rect(0, 0, 210, 40, 'F'); doc.setTextColor(56, 189, 248); doc.setFontSize(18);
        doc.text("UNUSED BALANCE STATEMENT", 15, 20); doc.setTextColor(255, 255, 255); doc.setFontSize(9);
        doc.text(`Shop: ${viewUnusedModal.shop.shop_name} (${viewUnusedModal.shop.shop_owner})`, 15, 28); doc.text(`Date Range: ${unusedStartDate || 'All Time'} to ${unusedEndDate || 'All Time'}`, 15, 33);
        autoTable(doc, { startY: 45, head: [['No', 'Date', 'Description', 'Added (In)', 'Deducted (Out)']], body: filteredHistory.map((item, index) => [index + 1, new Date(item.date).toLocaleDateString(), item.description, item.type === 'RECHARGE' ? `+ BDT ${item.amount}` : '-', item.type === 'LICENSE_ACTIVATION' ? `- BDT ${item.amount}` : '-']), theme: 'grid', headStyles: { fillColor: [56, 189, 248] } });
        doc.save(`Unused_Statement_${viewUnusedModal.shop.shop_id.slice(-6)}.pdf`);
    };

    return (
        <>
            {/* 🚀 FIXED CATCH-ALL FORM. DYNAMICALLY READS EXPENSE OR INCOME */}
            {(financeFormModal?.isOpen || ['finance_entry_income', 'finance_entry_expense', 'entry_income', 'entry_expense'].includes(activeTab)) && (
                <div className={financeFormModal?.isOpen ? "fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[200] uppercase font-black tracking-widest" : "bg-[#111A35] border border-[#273A60] rounded-xl p-8 max-w-2xl mx-auto shadow-2xl relative font-mono uppercase mt-4 mb-8"}>
                    <div className={financeFormModal?.isOpen ? "bg-[#111A35] border border-[#273A60] rounded-xl p-8 max-w-lg w-full shadow-2xl relative font-mono" : "w-full"}>
                        {financeFormModal?.isOpen && <button onClick={() => setFinanceFormModal({...financeFormModal, isOpen: false})} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl transition-colors">✕</button>}

                        <h3 className={`text-xl font-black mb-6 border-b border-[#273A60] pb-4 tracking-widest ${financeFormModal?.isOpen ? '' : 'text-center'} ${(activeTab.includes('expense') || financeFormModal?.type === 'EXPENSE') ? 'text-red-500' : 'text-green-500'}`}>
                            LOG MANUAL {(activeTab.includes('expense') || financeFormModal?.type === 'EXPENSE') ? 'EXPENSE' : 'INCOME'}
                        </h3>

                        <form onSubmit={(e) => handleFinanceSubmit(e, (activeTab.includes('expense') || financeFormModal?.type === 'EXPENSE') ? 'MANUAL_EXPENSE' : 'MANUAL_INCOME')} className="flex flex-col gap-4 text-[10px] font-bold">
                            <div>
                                <label className="text-gray-500 tracking-widest mb-1 block">Date</label>
                                <input type="date" value={financeFormModal?.date || ''} onChange={e => setFinanceFormModal({ ...financeFormModal, date: e.target.value })} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none w-full rounded" required />
                            </div>
                            <div>
                                <label className="text-gray-500 tracking-widest mb-1 block">Entry Name / Title</label>
                                <input type="text" placeholder="e.g. Office Rent" value={financeFormModal?.name || ''} onChange={e => setFinanceFormModal({ ...financeFormModal, name: e.target.value })} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none w-full rounded" required />
                            </div>
                            <div>
                                <label className="text-gray-500 tracking-widest mb-1 block">Amount (BDT)</label>
                                <input type="number" placeholder="Enter Amount" value={financeFormModal?.amount || ''} onChange={e => setFinanceFormModal({ ...financeFormModal, amount: e.target.value })} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none w-full rounded" required />
                            </div>
                            <div>
                                <label className="text-gray-500 tracking-widest mb-1 block">Description / Reason</label>
                                <input type="text" placeholder="Provide details..." value={financeFormModal?.description || ''} onChange={e => setFinanceFormModal({ ...financeFormModal, description: e.target.value })} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none w-full rounded" required />
                            </div>
                            <div>
                                <label className="text-gray-500 tracking-widest mb-1 block">Remarks / Invoice No (Optional)</label>
                                <input type="text" placeholder="Remarks..." value={financeFormModal?.remarks || ''} onChange={e => setFinanceFormModal({ ...financeFormModal, remarks: e.target.value })} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none w-full rounded" />
                            </div>
                            <button type="submit" className={`w-full py-3 rounded text-white font-black tracking-widest shadow-lg mt-2 transition-all ${(activeTab.includes('expense') || financeFormModal?.type === 'EXPENSE') ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}>
                                SUBMIT ENTRY
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 🚀 NEW: CASH BOOK LAYOUT */}
            {activeTab === 'finance_cashbook' && (() => {
                let cbTotalIncome = 0;
                let cbTotalExpense = 0;
                let cbCurrentBalance = 0;

                const sortedCashbook = [...(filteredLedger || [])].sort((a, b) => {
                    return new Date(a.createdAt || a.date || 0).getTime() - new Date(b.createdAt || b.date || 0).getTime();
                });

                const cashbookRows = sortedCashbook.map(tx => {
                    const txType = tx?.type || '';
                    const isIncome = ['MANUAL_INCOME', 'RECHARGE', 'INCOME', 'LICENSE_ACTIVATION'].includes(txType);
                    const isExpense = ['MANUAL_EXPENSE', 'COMMISSION', 'SR_PAYOUT', 'EXPENSE'].includes(txType) || (txType === 'PAYOUT_REQUEST' && tx?.status === 'SUCCESS');

                    let incAmt = 0;
                    let expAmt = 0;

                    if (isIncome) {
                        incAmt = Number(tx.amount || 0);
                        cbCurrentBalance += incAmt;
                        cbTotalIncome += incAmt;
                    } else if (isExpense) {
                        expAmt = Number(tx.amount || 0);
                        cbCurrentBalance -= expAmt;
                        cbTotalExpense += expAmt;
                    }

                    return { ...tx, incAmt, expAmt, runningBalance: cbCurrentBalance, isIncome, isExpense };
                }).filter(tx => tx.isIncome || tx.isExpense).reverse();

                const generateCashbookPDF = () => {
                    if (!cashbookRows || cashbookRows.length === 0) return alert("No data to download.");
                    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
                    doc.setFillColor(10, 17, 40); doc.rect(0, 0, 297, 40, 'F'); doc.setTextColor(56, 189, 248); doc.setFontSize(18);
                    doc.text("TRVNX_OS CASH BOOK STATEMENT", 15, 20); doc.setTextColor(255, 255, 255); doc.setFontSize(9);
                    doc.text(`Date Range: ${financeStartDate || 'All Time'} to ${financeEndDate || 'All Time'}`, 15, 30);

                    const tableBody = cashbookRows.map((tx, index) => [
                        index + 1,
                        new Date(tx.createdAt || tx.date).toLocaleDateString('en-GB'),
                        tx.type,
                        tx.name || tx.type,
                        tx.description || tx.remarks || 'N/A',
                        tx.isIncome ? `BDT ${tx.incAmt}` : '-',
                        tx.isExpense ? `BDT ${tx.expAmt}` : '-',
                        `BDT ${tx.runningBalance}`
                    ]);

                    autoTable(doc, {
                        startY: 45,
                        head: [['No', 'Date', 'Type', 'Title / Name', 'Description', 'Income (In)', 'Expense (Out)', 'Cash In Hand']],
                        body: tableBody,
                        theme: 'grid',
                        headStyles: { fillColor: [56, 189, 248] }
                    });

                    doc.setFontSize(12); doc.setTextColor(0, 0, 0);
                    doc.text(`TOTAL INCOME: BDT ${cbTotalIncome.toLocaleString()}   |   TOTAL EXPENSE: BDT ${cbTotalExpense.toLocaleString()}   |   CASH IN HAND: BDT ${(cbTotalIncome - cbTotalExpense).toLocaleString()}`, 15, doc.lastAutoTable.finalY + 10);
                    doc.save(`TRVNX_Cash_Book.pdf`);
                };

                return (
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-center bg-[#0A1128] p-4 rounded border border-[#273A60] gap-4 shadow-lg">
                            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                                <div className="flex items-center bg-[#050A15] border border-[#273A60] px-3 py-2 rounded w-full md:w-auto">
                                    <span className="text-gray-500 mr-2">🔍</span>
                                    <input type="text" placeholder="Search Cash Book..." value={financeSearchTerm} onChange={(e) => setFinanceSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-600 font-bold uppercase w-full md:w-48" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">From</label>
                                    <input type="date" className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-blue-300 outline-none uppercase font-bold" value={financeStartDate} onChange={(e) => setFinanceStartDate(e.target.value)} />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">To</label>
                                    <input type="date" className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-blue-300 outline-none uppercase font-bold" value={financeEndDate} onChange={(e) => setFinanceEndDate(e.target.value)} />
                                </div>
                                <button onClick={() => { setFinanceStartDate(''); setFinanceEndDate(''); setFinanceSearchTerm(''); }} className="bg-gray-800 text-gray-400 hover:text-white px-3 py-2 rounded text-[9px] font-black tracking-widest transition-colors uppercase mt-4">CLEAR</button>
                            </div>
                            <div className="flex gap-4 w-full md:w-auto justify-end">
                                <div className="bg-green-900/20 border border-green-500/30 px-4 py-2 rounded text-right shadow-lg">
                                    <div className="text-[8px] text-green-400 font-bold uppercase tracking-[0.2em]">Total Income</div>
                                    <div className="text-lg text-white font-black font-mono">৳{cbTotalIncome.toLocaleString()}</div>
                                </div>
                                <div className="bg-red-900/20 border border-red-500/30 px-4 py-2 rounded text-right shadow-lg">
                                    <div className="text-[8px] text-red-400 font-bold uppercase tracking-[0.2em]">Total Expense</div>
                                    <div className="text-lg text-white font-black font-mono">৳{cbTotalExpense.toLocaleString()}</div>
                                </div>
                                <div className="bg-blue-900/20 border border-blue-500/30 px-4 py-2 rounded text-right shadow-lg">
                                    <div className="text-[8px] text-blue-400 font-bold uppercase tracking-[0.2em]">Cash In Hand</div>
                                    <div className="text-lg text-white font-black font-mono">৳{(cbTotalIncome - cbTotalExpense).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl uppercase">
                            <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-300">Live Cash Book</h3>
                                <div className="flex gap-2">
                                    <button onClick={generateCashbookPDF} className="text-[9px] bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded shadow-lg transition-all font-black uppercase tracking-widest">📄 DOWNLOAD PDF</button>
                                    <button onClick={() => fetchData('admin/finance-ledger', setFinanceLedger)} className="text-[9px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 hover:bg-blue-500/40 transition-all font-black uppercase tracking-widest">↻ SYNC</button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase font-bold">
                                    <thead className="bg-[#050A15] text-gray-500 tracking-widest font-bold">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Type</th>
                                        <th className="p-4">Title / Name</th>
                                        <th className="p-4">Description</th>
                                        <th className="p-4 text-right">Income Amount</th>
                                        <th className="p-4 text-right">Expense Amount</th>
                                        <th className="p-4 text-right text-blue-400">Cash In Hand</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#162447]">
                                    {cashbookRows.map((tx, idx) => (
                                        <tr key={tx._id || idx} className="hover:bg-blue-900/5 transition-colors font-bold">
                                            <td className="p-4 text-gray-400">{new Date(tx.createdAt || tx.date).toLocaleDateString('en-GB')}</td>
                                            <td className="p-4"><span className={`px-2 py-0.5 rounded text-[8px] border ${tx.isIncome ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{tx.type}</span></td>
                                            <td className="p-4 text-white">
                                                {tx.name || tx.type}
                                            </td>
                                            <td className="p-4 text-gray-400 italic">
                                                {tx.description || tx.remarks || 'N/A'}
                                                <div className="text-[7px] text-blue-300 font-mono mt-1">ID: {tx.userId?.name || 'SYS'} ({(tx.userId && tx.userId._id ? String(tx.userId._id).slice(-6).toUpperCase() : 'SYS')})</div>
                                            </td>
                                            <td className="p-4 text-right text-green-400 font-mono font-black">{tx.isIncome ? `৳${tx.incAmt}` : '-'}</td>
                                            <td className="p-4 text-right text-red-400 font-mono font-black">{tx.isExpense ? `৳${tx.expAmt}` : '-'}</td>
                                            <td className="p-4 text-right text-blue-400 font-mono font-black">৳{tx.runningBalance}</td>
                                        </tr>
                                    ))}
                                    {cashbookRows.length === 0 && (
                                        <tr><td colSpan="7" className="p-8 text-center text-gray-600 text-xs italic tracking-widest">No cash book entries found.</td></tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* 🚀 LEDGER TABLE (Now only shows for Balance Sheet) */}
            {activeTab === 'finance_balance' && (
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-center bg-[#0A1128] p-4 rounded border border-[#273A60] gap-4 shadow-lg">
                        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                            <div className="flex items-center bg-[#050A15] border border-[#273A60] px-3 py-2 rounded w-full md:w-auto">
                                <span className="text-gray-500 mr-2">🔍</span>
                                <input type="text" placeholder="Search Ledger..." value={financeSearchTerm} onChange={(e) => setFinanceSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-600 font-bold uppercase w-full md:w-48" />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">From</label>
                                <input type="date" className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-blue-300 outline-none uppercase font-bold" value={financeStartDate} onChange={(e) => setFinanceStartDate(e.target.value)} />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">To</label>
                                <input type="date" className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-blue-300 outline-none uppercase font-bold" value={financeEndDate} onChange={(e) => setFinanceEndDate(e.target.value)} />
                            </div>
                            <button onClick={() => { setFinanceStartDate(''); setFinanceEndDate(''); setFinanceSearchTerm(''); }} className="bg-gray-800 text-gray-400 hover:text-white px-3 py-2 rounded text-[9px] font-black tracking-widest transition-colors uppercase mt-4">CLEAR</button>
                        </div>
                        <div className="flex gap-4 w-full md:w-auto justify-end">
                            <div className="bg-green-900/20 border border-green-500/30 px-4 py-2 rounded text-right shadow-lg">
                                <div className="text-[8px] text-green-400 font-bold uppercase tracking-[0.2em]">Total Income</div>
                                <div className="text-lg text-white font-black font-mono">৳{totalIncome.toLocaleString()}</div>
                            </div>
                            <div className="bg-red-900/20 border border-red-500/30 px-4 py-2 rounded text-right shadow-lg">
                                <div className="text-[8px] text-red-400 font-bold uppercase tracking-[0.2em]">Total Expense</div>
                                <div className="text-lg text-white font-black font-mono">৳{totalExpense.toLocaleString()}</div>
                            </div>
                            {(activeTab === 'finance_balance' || activeTab.includes('entry')) && (
                                <div className="bg-blue-900/20 border border-blue-500/30 px-4 py-2 rounded text-right shadow-lg">
                                    <div className="text-[8px] text-blue-400 font-bold uppercase tracking-[0.2em]">Net Balance</div>
                                    <div className="text-lg text-white font-black font-mono">৳{(totalIncome - totalExpense - totalUnusedLiability).toLocaleString()}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl uppercase">
                        <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-300">Finance Ledger Sync</h3>
                            <div className="flex gap-2">
                                <button onClick={() => generateFinancePDF(activeTab.replace('_', ' '), filteredLedger.filter(tx => tx.type !== 'DISTRIBUTOR_EXPENSE' && tx.type !== 'SR_COMMISSION'))} className="text-[9px] bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded shadow-lg transition-all font-black uppercase tracking-widest">📄 DOWNLOAD PDF</button>
                                <button onClick={() => fetchData('admin/finance-ledger', setFinanceLedger)} className="text-[9px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 hover:bg-blue-500/40 transition-all font-black uppercase tracking-widest">↻ SYNC</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase font-bold">
                                <thead className="bg-[#050A15] text-gray-500 tracking-widest font-bold">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">Title / Name</th>
                                    <th className="p-4">Description</th>
                                    <th className="p-4">User / Node</th>
                                    <th className="p-4 text-right">Amount (IN)</th>
                                    <th className="p-4 text-right">Amount (OUT)</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-[#162447]">
                                {(activeTab.includes('income') ? incomeEntries :
                                    activeTab.includes('expense') ? expenseEntries :
                                        filteredLedger.filter(tx => tx.type !== 'PAYOUT_REQUEST' && tx.type !== 'DISTRIBUTOR_EXPENSE' && tx.type !== 'SR_COMMISSION')).map((tx, idx) => {

                                    const isIncome = ['MANUAL_INCOME', 'RECHARGE', 'INCOME', 'LICENSE_ACTIVATION'].includes(tx.type);

                                    return (
                                        <tr key={tx._id || idx} className="hover:bg-blue-900/5 transition-colors font-bold">
                                            <td className="p-4 text-gray-400">{new Date(tx.createdAt || tx.date).toLocaleDateString('en-GB')}</td>
                                            <td className="p-4"><span className={`px-2 py-0.5 rounded text-[8px] border ${isIncome ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{tx.type}</span></td>
                                            <td className="p-4 text-white">
                                                {tx.name || tx.type}
                                                {tx.description && <div className="text-[7px] text-gray-500 mt-1">{tx.description}</div>}
                                            </td>
                                            <td className="p-4 text-blue-300 font-mono">
                                                {tx.userId?.name || 'SYS_ADMIN'}
                                                <span className="text-gray-600 text-[8px] ml-1">({tx.userId && tx.userId._id ? String(tx.userId._id).slice(-6).toUpperCase() : 'SYS'})</span>
                                            </td>
                                            <td className="p-4 text-right text-green-400 font-mono font-black">{isIncome ? `৳${tx.amount}` : '-'}</td>
                                            <td className="p-4 text-right text-red-400 font-mono font-black">{!isIncome ? `৳${tx.amount}` : '-'}</td>
                                        </tr>
                                    );
                                })}
                                {((activeTab.includes('income') ? incomeEntries : activeTab.includes('expense') ? expenseEntries : filteredLedger.filter(tx => tx.type !== 'PAYOUT_REQUEST')).length === 0) && (
                                    <tr><td colSpan="7" className="p-8 text-center text-gray-600 text-xs italic tracking-widest">No ledger entries found for this category.</td></tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'finance_recharge' && (
                <RechargeTerminal
                    handleShopRechargeSubmit={handleShopRechargeSubmit} rechargeSearchQuery={rechargeSearchQuery}
                    setRechargeSearchQuery={setRechargeSearchQuery} filteredRechargeShops={filteredRechargeShops}
                    rechargeForm={rechargeForm} setRechargeForm={setRechargeForm}
                    isRechargeSearchOpen={isRechargeSearchOpen} setIsRechargeSearchOpen={setIsRechargeSearchOpen}
                />
            )}

            {activeTab === 'finance_payouts' && (() => {
                const generatePayoutsPDF = () => {
                    const payoutsData = filteredLedger.filter(tx => tx.type === 'PAYOUT_REQUEST');
                    if (!payoutsData || payoutsData.length === 0) return alert("No payout data to download.");
                    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
                    doc.setFillColor(10, 17, 40); doc.rect(0, 0, 210, 40, 'F'); doc.setTextColor(168, 85, 247);
                    doc.setFontSize(18); doc.text("TRVNX_OS PAYOUT REQUESTS", 15, 20); doc.setTextColor(255, 255, 255); doc.setFontSize(9);
                    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, 30);

                    autoTable(doc, {
                        startY: 45,
                        head: [['No', 'Date', 'Distributor', 'ID', 'Amount', 'Status']],
                        body: payoutsData.map((tx, index) => [
                            index + 1,
                            new Date(tx.createdAt || tx.date).toLocaleDateString('en-GB'),
                            tx.userId?.name || 'UNKNOWN',
                            tx.userId?._id?.slice(-6).toUpperCase() || 'SYS',
                            `BDT ${tx.amount}`,
                            tx.status
                        ]),
                        theme: 'grid',
                        headStyles: { fillColor: [168, 85, 247] }
                    });
                    doc.save(`TRVNX_Payout_Requests.pdf`);
                };

                return (
                    <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl uppercase">
                        <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-purple-300">Distributor Payout Requests</h3>
                            <div className="flex gap-2">
                                <button onClick={generatePayoutsPDF} className="text-[9px] bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded shadow-lg transition-all font-black uppercase tracking-widest">📄 DOWNLOAD PDF</button>
                                <button onClick={() => fetchData('admin/finance-ledger', setFinanceLedger)} className="text-[9px] bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full border border-purple-500/30 hover:bg-purple-500/40 transition-all font-black uppercase tracking-widest">↻ SYNC</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase">
                                <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Distributor</th>
                                    <th className="p-4">Amount</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-[#162447]">
                                {filteredLedger.filter(tx => tx.type === 'PAYOUT_REQUEST').map((tx, idx) => (
                                    <tr key={tx._id || idx} className="hover:bg-purple-900/5 transition-colors">
                                        <td className="p-4 text-gray-400">{new Date(tx.createdAt || tx.date).toLocaleDateString('en-GB')}</td>
                                        <td className="p-4 text-white font-mono">{tx.userId?.name || 'UNKNOWN'} <span className="text-gray-600">({tx.userId?._id?.slice(-6) || 'SYS'})</span></td>
                                        <td className="p-4 text-green-400 font-mono">৳{tx.amount}</td>
                                        <td className="p-4 text-center text-yellow-500">{tx.status}</td>
                                        <td className="p-4 text-right">
                                            {tx.status === 'PENDING_ADMIN' && ['SUPER_ADMIN', 'ADMIN'].includes(user.role) && (
                                                <button onClick={() => handleApprovePayout(tx._id)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded shadow-lg">APPROVE</button>
                                            )}
                                            {tx.status === 'PENDING_ACCOUNTS' && ['SUPER_ADMIN', 'ACCOUNTS'].includes(user.role) && (
                                                <button onClick={() => handleReleasePayout(tx._id)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded shadow-lg">RELEASE FUNDS</button>
                                            )}
                                            {tx.status === 'SUCCESS' && <span className="text-green-500">RELEASED</span>}
                                        </td>
                                    </tr>
                                ))}
                                {filteredLedger.filter(tx => tx.type === 'PAYOUT_REQUEST').length === 0 && (
                                    <tr><td colSpan="5" className="p-8 text-center text-gray-600 text-xs italic tracking-widest">No payout requests found.</td></tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}

            {activeTab === 'finance_unused' && (() => {
                const generateAllUnusedPDF = () => {
                    if (!filteredUnused || filteredUnused.length === 0) return alert("No unused balance data to download.");
                    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
                    doc.setFillColor(10, 17, 40); doc.rect(0, 0, 210, 40, 'F'); doc.setTextColor(56, 189, 248);
                    doc.setFontSize(18); doc.text("TRVNX_OS UNUSED BALANCES", 15, 20); doc.setTextColor(255, 255, 255); doc.setFontSize(9);
                    doc.text(`Date Range: ${unusedStartDate || 'All Time'} to ${unusedEndDate || 'All Time'}`, 15, 30);

                    autoTable(doc, {
                        startY: 45,
                        head: [['No', 'Shop ID', 'Shop Name', 'Owner', 'Unused Balance']],
                        body: filteredUnused.map((shop, index) => [
                            index + 1,
                            shop.shop_id ? String(shop.shop_id).slice(-6).toUpperCase() : 'N/A',
                            shop.shop_name,
                            shop.shop_owner,
                            `BDT ${shop.current_balance}`
                        ]),
                        theme: 'grid',
                        headStyles: { fillColor: [56, 189, 248] }
                    });
                    doc.setFontSize(12); doc.setTextColor(0, 0, 0);
                    doc.text(`TOTAL UNUSED LIABILITY: BDT ${totalUnusedLiability.toLocaleString()}`, 15, doc.lastAutoTable.finalY + 10);
                    doc.save(`TRVNX_All_Unused_Balances.pdf`);
                };

                return (
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-center bg-[#0A1128] p-4 rounded border border-[#273A60] gap-4">
                            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                                <div className="flex flex-col">
                                    <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">From Date</label>
                                    <input type="date" className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-blue-300 outline-none uppercase font-bold" value={unusedStartDate} onChange={(e) => setUnusedStartDate(e.target.value)} />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">To Date</label>
                                    <input type="date" className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-blue-300 outline-none uppercase font-bold" value={unusedEndDate} onChange={(e) => setUnusedEndDate(e.target.value)} />
                                </div>
                                <button onClick={() => { setUnusedStartDate(''); setUnusedEndDate(''); }} className="bg-gray-800 text-gray-400 hover:text-white px-3 py-2 rounded text-[9px] font-black tracking-widest transition-colors uppercase mt-4">CLEAR</button>
                            </div>
                            <div className="bg-blue-900/20 border border-blue-500/30 px-6 py-3 rounded text-right shadow-lg">
                                <div className="text-[8px] text-blue-400 font-bold uppercase tracking-[0.2em] mb-1">Total Unused Liability</div>
                                <div className="text-xl text-white font-black tracking-tighter font-mono">৳{totalUnusedLiability.toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl uppercase">
                            <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-300">Shop Unused Balances Matrix</h3>
                                <div className="flex gap-2">
                                    <button onClick={generateAllUnusedPDF} className="text-[9px] bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded shadow-lg transition-all font-black uppercase tracking-widest">📄 DOWNLOAD PDF</button>
                                    <button onClick={() => fetchData('admin/unused-balance', setUnusedBalanceList)} className="text-[9px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 hover:bg-blue-500/40 transition-all font-black uppercase tracking-widest">↻ SYNC</button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase">
                                    <thead className="bg-[#050A15] text-gray-500 tracking-widest font-bold">
                                    <tr>
                                        <th className="p-4">Shop ID</th>
                                        <th className="p-4">Shop Name</th>
                                        <th className="p-4">Owner Name</th>
                                        <th className="p-4 text-right">Current Unused Balance</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#162447]">
                                    {filteredUnused.map((shop, idx) => (
                                        <tr key={shop.shop_id || idx} className="hover:bg-blue-900/5 transition-colors font-bold">
                                            <td className="p-4 text-blue-400 font-mono">{shop.shop_id ? String(shop.shop_id).slice(-6).toUpperCase() : 'N/A'}</td>
                                            <td className="p-4 text-white">{shop.shop_name}</td>
                                            <td className="p-4 text-gray-300">{shop.shop_owner}</td>
                                            <td className="p-4 text-right text-green-400 font-mono text-sm font-black">৳{shop.current_balance}</td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => setViewUnusedModal({isOpen: true, shop: shop, history: shop.history || []})} className="bg-transparent border border-[#273A60] text-gray-300 px-3 py-1.5 rounded text-[8px] hover:bg-gray-800 transition-all font-black uppercase tracking-widest">VIEW HISTORY</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUnused.length === 0 && (
                                        <tr><td colSpan="5" className="p-8 text-center text-gray-600 text-xs italic tracking-widest">No unused balance records found.</td></tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {viewUnusedModal.isOpen && viewUnusedModal.shop && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[140] uppercase font-black tracking-widest">
                    <div className="bg-[#0A1128] border border-[#273A60] rounded-xl w-full max-w-4xl p-8 shadow-2xl relative max-h-[90vh] flex flex-col font-mono uppercase">
                        <button onClick={() => setViewUnusedModal({isOpen: false, shop: null, history: []})} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 font-black text-xl">✕</button>

                        <div className="mb-6 border-b border-[#273A60] pb-4 flex justify-between items-end shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-white mb-1 tracking-widest uppercase">{viewUnusedModal.shop.shop_name}</h2>
                                <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest font-mono">ID: {viewUnusedModal.shop.shop_id} | OWNER: {viewUnusedModal.shop.shop_owner}</div>
                            </div>
                            <button onClick={generateUnusedStatementPDF} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded text-[9px] font-black tracking-widest shadow-lg transition-all flex items-center gap-2">
                                📄 DOWNLOAD PDF
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase font-bold">
                                <thead className="bg-[#050A15] text-gray-500 tracking-widest sticky top-0 z-10 font-black">
                                <tr>
                                    <th className="p-4">No</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Description</th>
                                    <th className="p-4 text-right">Added (In)</th>
                                    <th className="p-4 text-right">Deducted (Out)</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-[#273A60]">
                                {viewUnusedModal.history.filter(tx => {
                                    if (!unusedStartDate && !unusedEndDate) return true;
                                    const txDate = new Date(tx.date).setHours(0,0,0,0);
                                    const start = unusedStartDate ? new Date(unusedStartDate).setHours(0,0,0,0) : null;
                                    const end = unusedEndDate ? new Date(unusedEndDate).setHours(23,59,59,999) : null;
                                    if (start && end) return txDate >= start && txDate <= end;
                                    if (start) return txDate >= start;
                                    if (end) return txDate <= end;
                                    return true;
                                }).map((tx, idx) => (
                                    <tr key={idx} className="hover:bg-[#111A35] transition-colors font-bold">
                                        <td className="p-4 text-gray-600">{idx + 1}</td>
                                        <td className="p-4 text-gray-400">{new Date(tx.date).toLocaleDateString('en-GB')}</td>
                                        <td className="p-4 text-gray-300 italic">{tx.description}</td>
                                        <td className="p-4 text-right text-green-400 font-mono font-black">{tx.type === 'RECHARGE' ? `+ BDT ${tx.amount}` : '-'}</td>
                                        <td className="p-4 text-right text-red-400 font-mono font-black">{tx.type === 'LICENSE_ACTIVATION' ? `- BDT ${tx.amount}` : '-'}</td>
                                    </tr>
                                ))}
                                {viewUnusedModal.history.length === 0 && (
                                    <tr><td colSpan="5" className="p-8 text-center text-gray-600 text-xs italic tracking-widest font-bold">No transaction history found.</td></tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Finance;