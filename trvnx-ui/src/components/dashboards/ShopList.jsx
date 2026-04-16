import React, { useState } from 'react';

const ShopList = ({
                      escalatedShops, shopSearchTerm, setShopSearchTerm,
                      currentShopPage, setCurrentShopPage, totalShopPages,
                      paginatedShops, SHOPS_PER_PAGE, fetchData, setUsers,
                      setViewShopModal, toggleUserLock, setShopApproveModal,
                      viewShopModal, shopApproveModal
                  }) => {

    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState({});

    const processShopApproval = async (shopId, action) => {
        try {
            const res = await fetch('http://localhost:5000/api/admin/approve-shopkeeper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify({ shopId, action })
            });

            if (res.ok) {
                alert(`✅ SHOP ${action}D SUCCESSFULLY.`);
                setShopApproveModal({isOpen: false, shop: null});
                fetchData('auth/operators', setUsers);
            } else {
                const errorData = await res.json();
                if (errorData.message === 'TOKEN_EXPIRED_OR_INVALID' || res.status === 401) {
                    alert("❌ SESSION EXPIRED. Please log in again.");
                } else {
                    alert(`❌ ACTION FAILED: ${errorData.message || res.statusText}`);
                }
            }
        } catch (err) { alert("⚠️ SYSTEM OFFLINE."); }
    };

    const handleUpdateShop = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`http://localhost:5000/api/auth/update/${editFormData._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify(editFormData)
            });
            if (res.ok) {
                alert("✅ SHOP UPDATED SUCCESSFULLY.");
                setViewShopModal({isOpen: false, shop: null});
                setIsEditing(false);
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

    return (
        <div className="space-y-4">
            {escalatedShops.length > 0 && (
                <div className="bg-[#110505] border border-red-900/50 rounded overflow-hidden shadow-2xl uppercase">
                    <div className="p-4 bg-red-950/30 border-b border-red-900/50 flex justify-between items-center">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-red-400">Action Required: Escalated Approvals (48h+)</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase">
                            <thead className="bg-[#050A15] text-red-500/70 tracking-widest">
                            <tr>
                                <th className="p-4">ID No</th>
                                <th className="p-4">Shop Name</th>
                                <th className="p-4">Name</th>
                                <th className="p-4">Created At</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-red-900/20">
                            {escalatedShops.map((shop) => (
                                <tr key={shop._id} className="hover:bg-red-900/10 transition-colors">
                                    <td className="p-4 text-red-400 font-mono">{shop._id.slice(-6).toUpperCase()}</td>
                                    <td className="p-4 text-white">{shop.business_name || 'N/A'}</td>
                                    <td className="p-4 text-gray-300">{shop.name}</td>
                                    <td className="p-4 text-gray-400">{new Date(shop.createdAt).toLocaleString('en-GB')}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => { setViewShopModal({isOpen: true, shop: shop}); setIsEditing(false); setEditFormData(shop); }} className="bg-transparent border border-red-900/50 text-gray-300 px-3 py-1.5 rounded text-[8px] hover:bg-red-900/30 transition-all font-black uppercase">VIEW</button>
                                            <button onClick={() => setShopApproveModal({isOpen: true, shop: shop})} className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded text-[8px] font-black tracking-widest transition-all shadow-lg animate-pulse">ACTION REQUIRED</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center bg-[#0A1128] p-3 rounded border border-[#273A60]">
                <div className="flex items-center w-1/2 uppercase">
                    <span className="text-blue-500 mr-3 ml-2 text-sm">🔍</span>
                    <input type="text" placeholder="Search by ID, Shop Name, Name, or Phone..." value={shopSearchTerm} onChange={(e) => setShopSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-xs w-full text-white placeholder-gray-600 font-bold uppercase" />
                </div>
                <div className="text-[9px] font-bold text-gray-500 flex gap-4 pr-4 uppercase tracking-widest">
                    <button onClick={() => setCurrentShopPage(prev => Math.max(prev - 1, 1))} className="hover:text-white transition-colors">◀ PREV</button>
                    <span>PAGE {currentShopPage} OF {totalShopPages}</span>
                    <button onClick={() => setCurrentShopPage(prev => Math.min(prev + 1, totalShopPages))} className="hover:text-white transition-colors">NEXT ▶</button>
                </div>
            </div>

            <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl uppercase">
                <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-blue-300">Shopkeeper Directory</h3>
                    <button onClick={() => fetchData('auth/operators', setUsers)} className="text-[9px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 hover:bg-blue-500/40 transition-all font-black uppercase tracking-widest">↻ SYNC_DATA</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase">
                        <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                        <tr>
                            <th className="p-4">No</th>
                            <th className="p-4">ID No</th>
                            <th className="p-4">Shop Name</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Address</th>
                            <th className="p-4">Phone Number</th>
                            <th className="p-4 text-center">Approval Matrix</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-[#162447]">
                        {paginatedShops.map((shop, idx) => (
                            <tr key={shop._id} className="hover:bg-blue-900/5 transition-colors">
                                <td className="p-4 text-gray-600">{((currentShopPage - 1) * SHOPS_PER_PAGE) + idx + 1}</td>
                                <td className="p-4 text-blue-400 font-mono">{shop._id.slice(-6).toUpperCase()}</td>
                                <td className="p-4 text-white">{shop.business_name || 'N/A'}</td>
                                <td className="p-4 text-gray-300">{shop.name}</td>
                                <td className="p-4 text-gray-400 truncate max-w-[150px]">
                                    {shop.address?.thana ? `${shop.address.thana}, ${shop.address.district}` : 'N/A'}
                                </td>
                                <td className="p-4 text-gray-300 font-mono">{shop.phone}</td>

                                <td className="p-4 text-center">
                                    {(() => {
                                        let statusColor = "text-green-500";
                                        let statusText = shop.approval?.status || "APPROVED";
                                        let isClickableForAdmin = false;

                                        const hoursPassed = Math.abs(new Date() - new Date(shop.approval?.requested_at || shop.createdAt)) / 36e5;
                                        const isBypassed = statusText === 'WAITING_DISTRIBUTOR' && hoursPassed > 48;

                                        if (isBypassed) {
                                            statusColor = "text-red-500";
                                            statusText = "ESCALATED TO ADMIN";
                                            isClickableForAdmin = true;
                                        } else if (statusText === 'WAITING_DISTRIBUTOR') {
                                            if (hoursPassed > 24) statusColor = "text-red-500";
                                            else statusColor = "text-orange-500";
                                            isClickableForAdmin = true;
                                        } else if (statusText === 'WAITING_ADMIN') {
                                            statusColor = "text-blue-500";
                                            isClickableForAdmin = true;
                                        } else if (statusText === 'REJECTED') {
                                            statusColor = "text-red-600";
                                        }

                                        return (
                                            <div className="flex flex-col items-center">
                                                {isBypassed && <div className="text-[7px] text-red-500 font-black mb-1 animate-pulse uppercase">⚠️ Distributor Bypassed</div>}
                                                {isClickableForAdmin ? (
                                                    <button onClick={() => setShopApproveModal({isOpen: true, shop})} className={`px-2 py-1 rounded text-[8px] font-black border bg-[#111A35] hover:bg-gray-800 ${statusColor.replace('text', 'border').replace('500', '500/30')} ${statusColor} animate-pulse shadow-lg cursor-pointer`}>
                                                        {statusText} (CLICK TO ACTION)
                                                    </button>
                                                ) : (
                                                    <span className={`px-2 py-1 rounded text-[8px] font-black border ${statusColor.replace('text', 'bg').replace('500', '900/20')} ${statusColor.replace('text', 'border').replace('500', '500/30')} ${statusColor}`}>
                                                        {statusText}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </td>

                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        {/* 🚀 NEW: Mirror Button Added Here */}
                                        <button onClick={() => handleMirror(shop._id)} className="bg-purple-900/40 border border-purple-900/50 text-purple-400 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded text-[8px] transition-all font-black uppercase">MIRROR</button>
                                        <button onClick={() => { setViewShopModal({isOpen: true, shop: shop}); setIsEditing(false); setEditFormData(shop); }} className="bg-transparent border border-[#273A60] text-gray-300 px-3 py-1.5 rounded text-[8px] hover:bg-gray-800 transition-all font-black uppercase">VIEW</button>
                                        <button onClick={() => toggleUserLock(shop._id, shop.status || 'ACTIVE')} className={`px-4 py-1.5 rounded text-[8px] font-black tracking-widest transition-all ${shop.status === 'LOCKED' ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg' : 'bg-red-900/40 text-red-500 border border-red-900/50 hover:bg-red-600 hover:text-white'}`}>
                                            {shop.status === 'LOCKED' ? 'UNLOCK' : 'LOCK'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {paginatedShops.length === 0 && (
                            <tr><td colSpan="8" className="p-8 text-center text-gray-600 text-xs italic tracking-widest">No matching shopkeepers found.</td></tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {viewShopModal?.isOpen && viewShopModal?.shop && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[200]">
                    <div className="bg-[#111A35] border border-[#273A60] rounded-xl p-8 max-w-2xl w-full shadow-2xl relative uppercase font-bold text-[10px]">
                        <button onClick={() => setViewShopModal({ isOpen: false, shop: null })} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl font-black">✕</button>

                        <div className="flex justify-between items-center mb-6 border-b border-[#273A60] pb-4">
                            <h3 className="text-xl font-black uppercase text-blue-400 tracking-widest">SHOP PROFILE</h3>
                            {!isEditing && (
                                <button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-[9px] font-black tracking-widest shadow-lg transition-all">EDIT PROFILE</button>
                            )}
                        </div>

                        {!isEditing ? (
                            <div className="grid grid-cols-2 gap-4 text-white">
                                <div>
                                    <span className="text-gray-500 block mb-1 tracking-widest">Shop Name</span>
                                    <div className="bg-[#0A1128] p-3 rounded border border-[#273A60]">{viewShopModal.shop.business_name || viewShopModal.shop.shop_name || 'N/A'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-1 tracking-widest">Owner Name</span>
                                    <div className="bg-[#0A1128] p-3 rounded border border-[#273A60]">{viewShopModal.shop.name || 'N/A'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-1 tracking-widest">Phone Number</span>
                                    <div className="bg-[#0A1128] p-3 rounded border border-[#273A60]">{viewShopModal.shop.phone || 'N/A'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-1 tracking-widest">Status</span>
                                    <div className="bg-[#0A1128] p-3 rounded border border-[#273A60] text-green-400">{viewShopModal.shop.status || 'ACTIVE'}</div>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-gray-500 block mb-1 tracking-widest">Full Address</span>
                                    <div className="bg-[#0A1128] p-3 rounded border border-[#273A60]">
                                        {viewShopModal.shop.address ? `${viewShopModal.shop.address.line1 || ''} ${viewShopModal.shop.address.line2 || ''}, ${viewShopModal.shop.address.thana || ''}, ${viewShopModal.shop.address.district || ''}` : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleUpdateShop} className="grid grid-cols-2 gap-4 text-white">
                                <div className="flex flex-col">
                                    <label className="text-gray-500 mb-1 tracking-widest">Shop Name</label>
                                    <input type="text" value={editFormData.business_name || editFormData.shop_name || ''} onChange={e => setEditFormData({...editFormData, business_name: e.target.value})} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none rounded" required />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-gray-500 mb-1 tracking-widest">Owner Name</label>
                                    <input type="text" value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none rounded" required />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-gray-500 mb-1 tracking-widest">Phone Number</label>
                                    <input type="text" value={editFormData.phone || ''} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none rounded" required />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-gray-500 mb-1 tracking-widest">Status</label>
                                    <select value={editFormData.status || 'ACTIVE'} onChange={e => setEditFormData({...editFormData, status: e.target.value})} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none rounded">
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="LOCKED">LOCKED</option>
                                    </select>
                                </div>
                                <div className="col-span-2 flex flex-col">
                                    <label className="text-gray-500 mb-1 tracking-widest">Address Line 1</label>
                                    <input type="text" value={editFormData.address?.line1 || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, line1: e.target.value}})} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none rounded" />
                                </div>
                                <div className="col-span-2 flex gap-4 mt-4">
                                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 border border-[#273A60] text-gray-500 font-black text-[10px] hover:text-white transition-all uppercase tracking-widest">CANCEL</button>
                                    <button type="submit" className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-black text-[10px] shadow-lg transition-all uppercase tracking-widest">SAVE CHANGES</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {shopApproveModal?.isOpen && shopApproveModal?.shop && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[200]">
                    <div className="bg-[#111A35] border border-red-900/50 rounded-xl p-8 max-w-lg w-full shadow-2xl relative uppercase font-bold">
                        <button onClick={() => setShopApproveModal({ isOpen: false, shop: null })} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl font-black">✕</button>
                        <h3 className="text-xl font-black uppercase text-red-400 mb-6 border-b border-[#273A60] pb-4 tracking-widest">ACTION REQUIRED</h3>

                        <p className="text-gray-300 text-[10px] mb-6 leading-relaxed tracking-widest">
                            Shop <span className="text-blue-400">[{shopApproveModal.shop.business_name || shopApproveModal.shop.name}]</span> requires manual administrative review. Please verify the details before approving access to the network.
                        </p>

                        <div className="flex gap-4 mt-8">
                            <button onClick={() => processShopApproval(shopApproveModal.shop._id, 'APPROVE')} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded tracking-widest shadow-lg transition-colors text-[10px]">APPROVE SHOP</button>
                            <button onClick={() => processShopApproval(shopApproveModal.shop._id, 'REJECT')} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded tracking-widest shadow-lg transition-colors text-[10px]">REJECT SHOP</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShopList;