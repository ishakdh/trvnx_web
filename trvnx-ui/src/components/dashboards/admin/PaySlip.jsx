const PayoutSlip = ({ slipData, onClose }) => {
    if (!slipData) return null;
    return (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[110] animate-in fade-in duration-300 uppercase">
            <div className="bg-white text-black w-full max-w-md p-8 rounded-sm shadow-2xl relative overflow-hidden border-t-8 border-blue-600 print:m-0">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.06]">
                    <span className="text-6xl font-black rotate-[-35deg] whitespace-nowrap uppercase tracking-tighter">Verified Success Verified Success</span>
                </div>
                <div className="flex justify-between items-start mb-10 relative z-10">
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter text-blue-700 italic">TRVNX_OS</h2>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Digital Disbursement Record</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] font-bold text-gray-400 uppercase">Slip ID</p>
                        <p className="text-xs font-mono font-bold text-blue-600">{slipData.id}</p>
                    </div>
                </div>
                <div className="space-y-6 mb-10 relative z-10">
                    <div className="border-l-4 border-blue-600 pl-4">
                        <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Payee Details</p>
                        <h3 className="text-lg font-black uppercase text-gray-800">{slipData.payee}</h3>
                        <p className="text-sm font-mono text-gray-600">{slipData.phone}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-sm border border-gray-100">
                            <p className="text-[8px] text-gray-400 font-bold uppercase mb-1">Amount</p>
                            <p className="text-xl font-black text-green-700">৳ {Number(slipData.amount).toLocaleString()}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-sm border border-gray-100">
                            <p className="text-[8px] text-gray-400 font-bold uppercase mb-1">Timestamp</p>
                            <p className="text-[10px] font-bold text-gray-700">{new Date(slipData.date).toLocaleString('en-GB')}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-center border-2 border-green-600 border-dashed rounded p-2 mb-8 rotate-[-1deg] relative z-10">
                    <span className="text-green-600 font-black text-[10px] uppercase tracking-[0.2em]">Transaction_Verified_Success</span>
                </div>
                <div className="flex gap-3 print:hidden relative z-10 font-bold uppercase text-[10px]">
                    <button onClick={() => window.print()} className="flex-1 bg-blue-600 text-white py-3 rounded tracking-widest hover:bg-blue-700 transition-all">Print Receipt</button>
                    <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-400 py-3 rounded hover:bg-gray-50">Close</button>
                </div>
            </div>
        </div>
    );
};

export default PayoutSlip;