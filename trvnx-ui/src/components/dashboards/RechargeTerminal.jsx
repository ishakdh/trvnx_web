import React from 'react';

const RechargeTerminal = ({
                              handleShopRechargeSubmit, rechargeSearchQuery, setRechargeSearchQuery,
                              isRechargeSearchOpen, setIsRechargeSearchOpen, filteredRechargeShops,
                              rechargeForm, setRechargeForm
                          }) => {
    return (
        <div className="max-w-3xl mx-auto">
            <form onSubmit={handleShopRechargeSubmit} className="bg-[#111A35] p-8 border border-teal-900/30 rounded shadow-2xl relative overflow-hidden uppercase font-bold">
                <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                <h3 className="text-teal-400 font-black text-xs uppercase tracking-[0.2em] border-b border-[#273A60] pb-4 italic mb-6">Master Wallet Recharge Terminal</h3>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 relative">
                            <label className="text-[9px] text-gray-500 tracking-widest">Search Shop (Name, Phone, or ID)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Type name, phone, or ID..."
                                    className="w-full bg-[#050A15] border border-[#273A60] p-3 text-xs text-white outline-none focus:border-teal-500 font-mono"
                                    value={rechargeSearchQuery}
                                    onChange={e => {
                                        setRechargeSearchQuery(e.target.value);
                                        setIsRechargeSearchOpen(true);
                                        if(e.target.value === '') {
                                            setRechargeForm(p => ({...p, shopId: '', shopName: '', shopOwner: '', phone: ''}));
                                        }
                                    }}
                                    onFocus={() => setIsRechargeSearchOpen(true)}
                                />
                                <input type="hidden" required value={rechargeForm.shopId} />

                                {isRechargeSearchOpen && (
                                    <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-[#0A1128] border border-[#273A60] rounded shadow-2xl custom-scrollbar">
                                        {filteredRechargeShops.map(shop => (
                                            <div
                                                key={shop._id}
                                                className="p-3 border-b border-[#273A60] hover:bg-teal-900/20 cursor-pointer transition-colors"
                                                onClick={() => {
                                                    setRechargeForm(p => ({
                                                        ...p,
                                                        shopId: shop._id,
                                                        shopName: shop.business_name || 'N/A',
                                                        shopOwner: shop.name,
                                                        phone: shop.phone
                                                    }));
                                                    setRechargeSearchQuery(`${shop.business_name || shop.name} - ${shop.phone}`);
                                                    setIsRechargeSearchOpen(false);
                                                }}
                                            >
                                                <div className="text-white text-xs">{shop.business_name || 'N/A'} <span className="text-teal-400 font-mono">({shop.phone})</span></div>
                                                <div className="text-[8px] text-gray-500 font-mono mt-1">Owner: {shop.name} | ID: {shop._id.slice(-6).toUpperCase()}</div>
                                            </div>
                                        ))}
                                        {filteredRechargeShops.length === 0 && (
                                            <div className="p-3 text-xs text-gray-500 italic text-center">No matching shops found.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] text-gray-500 tracking-widest">Date</label>
                            <input type="date" className="w-full bg-[#050A15] border border-[#273A60] p-3 text-xs text-white outline-none" value={rechargeForm.date} onChange={e => setRechargeForm({...rechargeForm, date: e.target.value})} required />
                        </div>
                    </div>

                    {rechargeForm.shopName && (
                        <div className="bg-teal-900/10 border border-teal-500/20 p-4 rounded text-[9px] text-teal-300 font-mono flex flex-col gap-1">
                            <div><span className="text-gray-500">Auto-Detected Shop:</span> {rechargeForm.shopName}</div>
                            <div><span className="text-gray-500">Owner Identity:</span> {rechargeForm.shopOwner}</div>
                            <div><span className="text-gray-500">Contact Node:</span> {rechargeForm.phone}</div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[9px] text-gray-500 tracking-widest">Recharge Amount (BDT)</label>
                            <input type="number" placeholder="৳ 0.00" className="w-full bg-[#050A15] border border-[#273A60] p-3 text-sm text-green-400 outline-none focus:border-teal-500 font-mono font-black" value={rechargeForm.amount} onChange={e => setRechargeForm({...rechargeForm, amount: e.target.value})} required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] text-gray-500 tracking-widest">Payment Method</label>
                            <select className="w-full bg-[#050A15] border border-[#273A60] p-3 text-xs text-white outline-none" value={rechargeForm.method} onChange={e => setRechargeForm({...rechargeForm, method: e.target.value})}>
                                <option value="Cash">CASH</option>
                                <option value="bKash">BKASH</option>
                                <option value="Nagad">NAGAD</option>
                                <option value="Bank">BANK TRANSFER</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] text-gray-500 tracking-widest">Transaction Remarks / References</label>
                        <input type="text" placeholder="Optional details..." className="w-full bg-[#050A15] border border-[#273A60] p-3 text-xs text-white outline-none" value={rechargeForm.otherDetails} onChange={e => setRechargeForm({...rechargeForm, otherDetails: e.target.value})} />
                    </div>

                    <button type="submit" disabled={!rechargeForm.shopName} className={`w-full py-4 rounded text-[10px] font-black tracking-[0.4em] transition-all shadow-lg uppercase ${rechargeForm.shopName ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/40' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
                        {rechargeForm.shopName ? 'EXECUTE RECHARGE' : 'WAITING FOR VALID ID...'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RechargeTerminal;