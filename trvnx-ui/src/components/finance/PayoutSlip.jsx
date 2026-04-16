import React from 'react';

const PayoutSlip = ({ slipData, onClose }) => {
    if (!slipData) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
            {/* --- SLIP CONTAINER --- */}
            <div className="bg-white text-black w-full max-w-md p-8 rounded-sm shadow-2xl relative overflow-hidden border-t-8 border-blue-600 print:shadow-none print:m-0">

                {/* 🎯 WATERMARK (Background Layer) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-[0.07]">
                    <span className="text-6xl font-black rotate-[-35deg] whitespace-nowrap uppercase tracking-tighter">
                        Verified Success Verified Success Verified Success
                    </span>
                </div>

                {/* --- HEADER --- */}
                <div className="flex justify-between items-start mb-8 relative z-10">
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter text-blue-700 italic">TRVNX_OS</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Financial Disbursement Slip</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Transaction ID</p>
                        <p className="text-xs font-mono font-bold text-blue-600">{slipData.id}</p>
                    </div>
                </div>

                {/* --- PAYEE DETAILS --- */}
                <div className="space-y-6 mb-8 relative z-10">
                    <div className="border-l-4 border-blue-600 pl-4">
                        <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Payee Information</p>
                        <h3 className="text-lg font-black uppercase text-gray-800">{slipData.payee}</h3>
                        <p className="text-sm font-mono text-gray-600">{slipData.phone}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-sm">
                            <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Amount Disbursed</p>
                            <p className="text-xl font-black text-green-700">৳ {slipData.amount.toLocaleString()}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-sm">
                            <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Issue Date</p>
                            <p className="text-xs font-bold text-gray-700">
                                {new Date(slipData.date).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- STATUS STAMP --- */}
                <div className="flex items-center justify-center border-2 border-green-600 border-dashed rounded p-2 mb-8 rotate-[-2deg] relative z-10">
                    <span className="text-green-600 font-black text-sm uppercase tracking-[0.3em]">PAYMENT_SUCCESSFUL_VERIFIED</span>
                </div>

                {/* --- FOOTER / ACTIONS (Hidden on Print) --- */}
                <div className="flex gap-3 print:hidden relative z-10">
                    <button
                        onClick={handlePrint}
                        className="flex-1 bg-blue-600 text-white py-3 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                    >
                        Print Slip
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 border border-gray-300 text-gray-400 py-3 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors"
                    >
                        Close
                    </button>
                </div>

                <p className="text-[7px] text-center text-gray-400 uppercase mt-4 print:mt-10 tracking-widest">
                    This is a computer-generated transaction record for TRVNX Node Operators.
                </p>
            </div>
        </div>
    );
};

export default PayoutSlip;