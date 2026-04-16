import React, { useState, useEffect, useMemo } from 'react';
import MultiSelectDropdown from "./admin/MultiSelectDropdown.jsx";
import { BD_DATA } from '../../utils/bd_geo.js';

const LicenseFee = ({ activeTab, setActiveTab, marketOptions }) => {
    // --- Data States ---
    const [allLicenseFeesList, setAllLicenseFeesList] = useState([]);

    // --- Filter States ---
    const [feeFilterStatus, setFeeFilterStatus] = useState('ALL'); // 'ALL', 'LIVE', 'CLOSE'
    const [offerFilterStatus, setOfferFilterStatus] = useState('ALL'); // 'ALL', 'LIVE', 'CLOSE'

    // --- Offer Form State ---
    const [offerForm, setOfferForm] = useState({
        name: '', offerName: '', startDate: '', endDate: '',
        markets: [], priceType: 'FIXED', priceValue: ''
    });

    // --- Create Fee Form State ---
    const [createForm, setCreateForm] = useState({
        name: '', markets: [], feeAmount: ''
    });

    // Fetch the list of all fees when the list tab is opened
    useEffect(() => {
        if (activeTab === 'license_list' || activeTab === 'license_all_offer') {
            fetchAllFees();
        }
    }, [activeTab]);

    const fetchAllFees = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/settings/license-fees', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` }
            });
            const data = await res.json();

            let listArray = [];
            if (Array.isArray(data)) listArray = data;
            else if (data && data.data && Array.isArray(data.data)) listArray = data.data;

            setAllLicenseFeesList(listArray);
        } catch (err) {
            console.error("Fetch Error:", err);
        }
    };

    // --- DYNAMIC MARKET OPTION FILTERING ---
    const distributorOptions = useMemo(() => {
        return (marketOptions || []).filter(o => o.startsWith('DIST:')).map(o => o.replace('DIST: ', ''));
    }, [marketOptions]);

    const currentForm = activeTab === 'license_offer' ? offerForm : createForm;

    const allDistricts = useMemo(() => {
        if (!BD_DATA) return [];
        return Object.values(BD_DATA).flatMap(division => Object.keys(division));
    }, []);

    const availableThanas = useMemo(() => {
        if (!BD_DATA) return [];
        const selectedDistricts = currentForm.markets.filter(m => allDistricts.includes(m));

        if (selectedDistricts.length === 0) {
            return Object.values(BD_DATA).flatMap(division => Object.values(division).flatMap(thanas => thanas));
        } else {
            let filteredThanas = [];
            Object.values(BD_DATA).forEach(division => {
                selectedDistricts.forEach(district => {
                    if (division[district]) filteredThanas = [...filteredThanas, ...division[district]];
                });
            });
            return filteredThanas;
        }
    }, [currentForm.markets, allDistricts]);

    // Multi-box helpers
    const toggleMarket = (setter, value) => {
        setter(p => ({ ...p, markets: p.markets.includes(value) ? p.markets.filter(x => x !== value) : [...p.markets, value] }));
    };

    const toggleMarketGroup = (setter, isSelecting, groupOptions) => {
        setter(p => {
            const newMarkets = isSelecting ? Array.from(new Set([...p.markets, ...groupOptions])) : p.markets.filter(x => !groupOptions.includes(x));
            return { ...p, markets: newMarkets };
        });
    };

    // 🔥 NEW: STRICT MARKET OVERLAP VALIDATION
    const checkMarketOverlap = (newType, newMarkets, newStart, newEnd) => {
        if (!Array.isArray(allLicenseFeesList)) return false;

        // Only check against currently LIVE configurations
        const liveConfigs = allLicenseFeesList.filter(fee => fee.status === 'LIVE' || !fee.status);

        // If making a GLOBAL rule (markets array is empty)
        if (newMarkets.length === 0) {
            const conflict = liveConfigs.find(fee => {
                if (fee.type !== newType) return false;

                // If it's an offer, check if time overlaps
                if (newType === 'PROMOTIONAL_OFFER') {
                    const startOverlap = new Date(newStart) <= new Date(fee.end_date || '2099-01-01');
                    const endOverlap = new Date(newEnd) >= new Date(fee.start_date || '2000-01-01');
                    if (!(startOverlap && endOverlap)) return false; // Times don't overlap, it's safe.
                }
                return true; // Conflict found!
            });
            return conflict ? "GLOBAL_CONFLICT" : false;
        }

        // If making a SPECIFIC rule (markets array has items)
        const conflict = liveConfigs.find(fee => {
            if (fee.type !== newType) return false;

            // Time Overlap Check for Offers
            if (newType === 'PROMOTIONAL_OFFER') {
                const startOverlap = new Date(newStart) <= new Date(fee.end_date || '2099-01-01');
                const endOverlap = new Date(newEnd) >= new Date(fee.start_date || '2000-01-01');
                if (!(startOverlap && endOverlap)) return false;
            }

            const existingMarkets = fee.target_markets || [];

            // If an existing rule is Global, it automatically overlaps with this new specific rule
            if (existingMarkets.length === 0) return true;

            // Check if any specific markets overlap
            return newMarkets.some(m => existingMarkets.includes(m));
        });

        return conflict ? conflict.name || conflict.offer_name : false;
    };

    // --- SUBMISSIONS ---
    const handleSaveOffer = async (e) => {
        e.preventDefault();

        // Block Overlaps!
        const overlap = checkMarketOverlap('PROMOTIONAL_OFFER', offerForm.markets, offerForm.startDate, offerForm.endDate);
        if (overlap === "GLOBAL_CONFLICT") return alert("Error: A Global Promotional Offer is already LIVE in this time range. Close it before creating a new one.");
        if (overlap) return alert(`Error: Market Overlap! These areas are already targeted by the LIVE offer: [${overlap}] during this time range.`);

        try {
            const payload = {
                type: 'PROMOTIONAL_OFFER',
                name: offerForm.name,
                offer_name: offerForm.offerName,
                start_date: offerForm.startDate,
                end_date: offerForm.endDate,
                target_markets: offerForm.markets,
                price_type: offerForm.priceType,
                price_value: Number(offerForm.priceValue),
                status: 'LIVE' // Sets to live automatically
            };

            const res = await fetch('http://localhost:5000/api/settings/license-fees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("✅ PROMOTIONAL OFFER DEPLOYED SUCCESSFULLY.");
                setOfferForm({ name: '', offerName: '', startDate: '', endDate: '', markets: [], priceType: 'FIXED', priceValue: '' });
                setActiveTab('license_all_offer');
            } else { alert("Failed to deploy promotional offer."); }
        } catch (err) { console.error(err); }
    };

    const handleSaveCreate = async (e) => {
        e.preventDefault();

        // Block Overlaps!
        const overlap = checkMarketOverlap('STANDARD_FEE', createForm.markets, null, null);
        if (overlap === "GLOBAL_CONFLICT") return alert("Error: A Global Standard Fee is already LIVE. Close it before creating a new one.");
        if (overlap) return alert(`Error: Market Overlap! These areas are already targeted by the LIVE standard fee: [${overlap}].`);

        try {
            const payload = {
                type: 'STANDARD_FEE',
                name: createForm.name,
                target_markets: createForm.markets,
                fee_amount: Number(createForm.feeAmount),
                status: 'LIVE'
            };

            const res = await fetch('http://localhost:5000/api/settings/license-fees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("✅ STANDARD FEE CONFIGURED SUCCESSFULLY.");
                setCreateForm({ name: '', markets: [], feeAmount: '' });
                setActiveTab('license_list');
            } else { alert("Failed to configure fee."); }
        } catch (err) { console.error(err); }
    };

    // Toggle Live/Close Status
    const toggleFeeStatus = async (feeId, currentStatus) => {
        const newStatus = currentStatus === 'LIVE' ? 'CLOSE' : 'LIVE';
        if (!window.confirm(`Are you sure you want to change this configuration to ${newStatus}?`)) return;

        try {
            const res = await fetch(`http://localhost:5000/api/settings/license-fees/${feeId}/toggle-status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                fetchAllFees(); // Reload table
            } else { alert("Failed to update status."); }
        } catch (err) { console.error(err); }
    };

    // --- Filter Arrays for the Tables ---
    const standardFees = Array.isArray(allLicenseFeesList) ? allLicenseFeesList.filter(f => f.type === 'STANDARD_FEE') : [];
    const promotionalOffers = Array.isArray(allLicenseFeesList) ? allLicenseFeesList.filter(f => f.type === 'PROMOTIONAL_OFFER') : [];

    const displayedFees = standardFees.filter(f => feeFilterStatus === 'ALL' || (f.status || 'LIVE') === feeFilterStatus);
    const displayedOffers = promotionalOffers.filter(f => offerFilterStatus === 'ALL' || (f.status || 'LIVE') === offerFilterStatus);

    return (
        <div className="w-full">

            {/* TAB: LICENSE FEE > OFFER */}
            {activeTab === 'license_offer' && (
                <div className="max-w-4xl mx-auto space-y-12 uppercase font-black tracking-widest">
                    <form onSubmit={handleSaveOffer} className="bg-[#111A35] p-8 border border-blue-900/30 rounded shadow-2xl relative overflow-hidden uppercase font-bold font-black">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 uppercase font-black"></div>
                        <h3 className="text-blue-400 font-black text-xs uppercase tracking-[0.2em] border-b border-[#273A60] pb-4 italic mb-6 tracking-widest uppercase font-black">Configure Promotional Offer</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 uppercase tracking-widest uppercase font-black">
                            <div className="space-y-2 uppercase font-black">
                                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest font-black uppercase">Configuration Name</p>
                                <input type="text" placeholder="e.g. Eid Special config" required className="w-full bg-black border border-[#273A60] p-3 text-xs text-blue-300 outline-none focus:border-blue-500 font-bold uppercase tracking-widest" value={offerForm.name} onChange={e => setOfferForm({...offerForm, name: e.target.value})} />
                            </div>
                            <div className="space-y-2 uppercase font-black">
                                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest font-black uppercase">Public Offer Name</p>
                                <input type="text" placeholder="e.g. 50% Off Eid Bonanza" required className="w-full bg-black border border-[#273A60] p-3 text-xs text-blue-300 outline-none focus:border-blue-500 font-bold uppercase tracking-widest" value={offerForm.offerName} onChange={e => setOfferForm({...offerForm, offerName: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-2">
                                <label className="text-[9px] text-gray-500 uppercase tracking-widest">Start Date</label>
                                <input required type="date" className="w-full bg-black border border-[#273A60] p-3 text-xs text-blue-300 outline-none font-bold" value={offerForm.startDate} onChange={e => setOfferForm({...offerForm, startDate: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] text-gray-500 uppercase tracking-widest">End Date</label>
                                <input required type="date" className="w-full bg-black border border-[#273A60] p-3 text-xs text-blue-300 outline-none font-bold" value={offerForm.endDate} onChange={e => setOfferForm({...offerForm, endDate: e.target.value})} />
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest font-black uppercase">Target Market Area</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <MultiSelectDropdown title="1. Select Distributors" options={distributorOptions} selected={offerForm.markets} onChange={v => toggleMarket(setOfferForm, v)} onToggleAll={s => toggleMarketGroup(setOfferForm, s, distributorOptions)} />
                                <MultiSelectDropdown title="2. Select Districts" options={allDistricts} selected={offerForm.markets} onChange={v => toggleMarket(setOfferForm, v)} onToggleAll={s => toggleMarketGroup(setOfferForm, s, allDistricts)} />
                                <MultiSelectDropdown title="3. Select Thanas" options={availableThanas} selected={offerForm.markets} onChange={v => toggleMarket(setOfferForm, v)} onToggleAll={s => toggleMarketGroup(setOfferForm, s, availableThanas)} />
                            </div>
                            <p className="text-[8px] text-gray-600 mt-2 italic normal-case">System will automatically block duplicate LIVE offers in the same market area if the dates overlap.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 uppercase tracking-widest uppercase font-black">
                            <div className="space-y-2 uppercase font-black">
                                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest font-black uppercase">Pricing Structure</p>
                                <select required className="w-full bg-black border border-[#273A60] p-3 text-xs text-blue-300 outline-none focus:border-blue-500 font-bold uppercase tracking-widest" value={offerForm.priceType} onChange={e => setOfferForm({...offerForm, priceType: e.target.value})}>
                                    <option value="FIXED">Flat Fixed Amount (৳)</option>
                                    <option value="PERCENTAGE">Discount Percentage (%)</option>
                                </select>
                            </div>
                            <div className="space-y-2 uppercase font-black">
                                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest font-black uppercase">Value / Amount</p>
                                <input type="number" placeholder={offerForm.priceType === 'FIXED' ? "e.g. 1500" : "e.g. 50"} required className="w-full bg-black border border-[#273A60] p-3 text-xs text-green-400 outline-none focus:border-blue-500 font-bold uppercase tracking-widest" value={offerForm.priceValue} onChange={e => setOfferForm({...offerForm, priceValue: e.target.value})} />
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded text-[10px] font-black tracking-[0.3em] uppercase transition-all shadow-lg shadow-blue-900/40">Deploy_Promotional_Offer</button>
                    </form>
                </div>
            )}

            {/* TAB: LICENSE FEE > CREATE */}
            {activeTab === 'license_create' && (
                <div className="max-w-4xl mx-auto space-y-12 uppercase font-black tracking-widest">
                    <form onSubmit={handleSaveCreate} className="bg-[#111A35] p-8 border border-blue-900/30 rounded shadow-2xl relative overflow-hidden uppercase font-bold font-black">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 uppercase font-black"></div>
                        <h3 className="text-blue-400 font-black text-xs uppercase tracking-[0.2em] border-b border-[#273A60] pb-4 italic mb-6 tracking-widest uppercase font-black">Standard License Key Configuration</h3>

                        <div className="space-y-2 mb-6 uppercase font-black">
                            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest font-black uppercase">Matrix Fee Name</p>
                            <input type="text" placeholder="e.g. Standard Fee Dhaka Zone" required className="w-full bg-black border border-[#273A60] p-3 text-xs text-blue-300 outline-none focus:border-blue-500 font-bold uppercase tracking-widest" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} />
                        </div>

                        <div className="space-y-3 mb-6">
                            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest font-black uppercase">Target Market Area</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <MultiSelectDropdown title="1. Select Distributors" options={distributorOptions} selected={createForm.markets} onChange={v => toggleMarket(setCreateForm, v)} onToggleAll={s => toggleMarketGroup(setCreateForm, s, distributorOptions)} />
                                <MultiSelectDropdown title="2. Select Districts" options={allDistricts} selected={createForm.markets} onChange={v => toggleMarket(setCreateForm, v)} onToggleAll={s => toggleMarketGroup(setCreateForm, s, allDistricts)} />
                                <MultiSelectDropdown title="3. Select Thanas" options={availableThanas} selected={createForm.markets} onChange={v => toggleMarket(setCreateForm, v)} onToggleAll={s => toggleMarketGroup(setCreateForm, s, availableThanas)} />
                            </div>
                            <p className="text-[8px] text-gray-600 mt-2 italic normal-case">Note: Leaving all boxes blank applies the fee globally. System blocks duplicate LIVE standard fees overlapping in the same area.</p>
                        </div>

                        <div className="space-y-2 mb-8 uppercase font-black">
                            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest font-black uppercase">Standard Fee Amount (৳)</p>
                            <input type="number" placeholder="e.g. 2000" required className="w-full bg-black border border-[#273A60] p-3 text-xs text-green-400 outline-none focus:border-blue-500 font-bold uppercase tracking-widest font-mono" value={createForm.feeAmount} onChange={e => setCreateForm({...createForm, feeAmount: e.target.value})} />
                        </div>

                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded text-[10px] font-black tracking-[0.3em] uppercase transition-all shadow-lg shadow-blue-900/40">Configure_Standard_Fee</button>
                    </form>
                </div>
            )}

            {/* TAB: LICENSE FEE > ALL FEE */}
            {activeTab === 'license_list' && (
                <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl uppercase">
                    <div className="p-4 bg-[#162447] border-b border-[#273A60] flex flex-col md:flex-row justify-between items-center gap-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-300">Global Standard Fees</h3>

                        <div className="flex gap-4 items-center">
                            {/* 🔥 Live/Close Filter Toggle */}
                            <div className="flex bg-[#050A15] border border-[#273A60] rounded overflow-hidden text-[9px] font-black tracking-widest">
                                <button onClick={() => setFeeFilterStatus('ALL')} className={`px-4 py-1.5 ${feeFilterStatus === 'ALL' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>ALL</button>
                                <button onClick={() => setFeeFilterStatus('LIVE')} className={`px-4 py-1.5 border-l border-r border-[#273A60] ${feeFilterStatus === 'LIVE' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>LIVE</button>
                                <button onClick={() => setFeeFilterStatus('CLOSE')} className={`px-4 py-1.5 ${feeFilterStatus === 'CLOSE' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>CLOSE</button>
                            </div>
                            <button onClick={fetchAllFees} className="text-[9px] bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded border border-blue-500/30 hover:bg-blue-500/40 transition-all font-black uppercase tracking-widest">↻ SYNC</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase">
                            <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                            <tr>
                                <th className="p-5">No</th>
                                <th className="p-5">Matrix Fee Name</th>
                                <th className="p-5">Market Targeting</th>
                                <th className="p-5 text-right">Value Matrix</th>
                                <th className="p-5 text-center">Status</th>
                                <th className="p-5 text-center">Action</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-[#162447]">
                            {displayedFees.map((fee, idx) => (
                                <tr key={fee._id || idx} className="hover:bg-blue-900/5 transition-colors">
                                    <td className="p-5 text-gray-600">{idx + 1}</td>
                                    <td className="p-5 text-white">{fee.name}</td>
                                    <td className="p-5">
                                        <div className="max-w-[300px] truncate text-gray-400">
                                            {Array.isArray(fee.target_markets) && fee.target_markets.length > 0
                                                ? fee.target_markets.join(', ')
                                                : <span className="text-blue-500 italic font-black">GLOBAL TARGET (ALL)</span>}
                                        </div>
                                    </td>
                                    <td className="p-5 text-right text-green-400 font-mono text-xs">
                                        ৳{fee.fee_amount || fee.price_value || 0}
                                    </td>
                                    <td className="p-5 text-center">
                                        <span className={`px-2 py-1 rounded text-[8px] font-black border ${fee.status === 'LIVE' || !fee.status ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                                            {fee.status || 'LIVE'}
                                        </span>
                                    </td>
                                    <td className="p-5 text-center">
                                        <button
                                            onClick={() => toggleFeeStatus(fee._id, fee.status || 'LIVE')}
                                            className={`text-[8px] px-3 py-1 rounded border ${fee.status === 'LIVE' || !fee.status ? 'text-red-400 border-red-500/30 hover:bg-red-500/10' : 'text-green-400 border-green-500/30 hover:bg-green-500/10'}`}
                                        >
                                            MARK {fee.status === 'LIVE' || !fee.status ? 'CLOSE' : 'LIVE'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {displayedFees.length === 0 && (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-600 text-xs italic tracking-widest">No standard license fees match filter.</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 🔥 NEW TAB: LICENSE FEE > ALL OFFER */}
            {activeTab === 'license_all_offer' && (
                <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl uppercase">
                    <div className="p-4 bg-[#162447] border-b border-[#273A60] flex flex-col md:flex-row justify-between items-center gap-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-pink-300">Global Promotional Offers</h3>

                        <div className="flex gap-4 items-center">
                            {/* 🔥 Live/Close Filter Toggle */}
                            <div className="flex bg-[#050A15] border border-[#273A60] rounded overflow-hidden text-[9px] font-black tracking-widest">
                                <button onClick={() => setOfferFilterStatus('ALL')} className={`px-4 py-1.5 ${offerFilterStatus === 'ALL' ? 'bg-pink-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>ALL</button>
                                <button onClick={() => setOfferFilterStatus('LIVE')} className={`px-4 py-1.5 border-l border-r border-[#273A60] ${offerFilterStatus === 'LIVE' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>LIVE</button>
                                <button onClick={() => setOfferFilterStatus('CLOSE')} className={`px-4 py-1.5 ${offerFilterStatus === 'CLOSE' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>CLOSE</button>
                            </div>
                            <button onClick={fetchAllFees} className="text-[9px] bg-pink-500/20 text-pink-400 px-3 py-1.5 rounded border border-pink-500/30 hover:bg-pink-500/40 transition-all font-black uppercase tracking-widest">↻ SYNC</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase">
                            <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                            <tr>
                                <th className="p-5">No</th>
                                <th className="p-5">Config Name</th>
                                <th className="p-5">Public Offer</th>
                                <th className="p-5">Duration</th>
                                <th className="p-5">Market Targeting</th>
                                <th className="p-5 text-right">Value Matrix</th>
                                <th className="p-5 text-center">Status</th>
                                <th className="p-5 text-center">Action</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-[#162447]">
                            {displayedOffers.map((offer, idx) => {
                                // Auto check if date is expired
                                const isExpired = offer.end_date && new Date(offer.end_date) < new Date();
                                const isPending = offer.start_date && new Date(offer.start_date) > new Date();

                                return (
                                    <tr key={offer._id || idx} className="hover:bg-pink-900/5 transition-colors">
                                        <td className="p-5 text-gray-600">{idx + 1}</td>
                                        <td className="p-5 text-white">{offer.name}</td>
                                        <td className="p-5 text-pink-300 tracking-widest">{offer.offer_name}</td>
                                        <td className="p-5 text-gray-400">
                                            {offer.start_date ? new Date(offer.start_date).toLocaleDateString('en-GB') : '-'} TO {offer.end_date ? new Date(offer.end_date).toLocaleDateString('en-GB') : '-'}
                                            {isExpired && <div className="text-red-500 text-[7px] mt-1 font-black">EXPIRED</div>}
                                            {isPending && <div className="text-yellow-500 text-[7px] mt-1 font-black">PENDING START</div>}
                                        </td>
                                        <td className="p-5">
                                            <div className="max-w-[200px] truncate text-gray-400">
                                                {Array.isArray(offer.target_markets) && offer.target_markets.length > 0
                                                    ? offer.target_markets.join(', ')
                                                    : <span className="text-pink-500 italic font-black">GLOBAL TARGET (ALL)</span>}
                                            </div>
                                        </td>
                                        <td className="p-5 text-right text-green-400 font-mono text-xs">
                                            {offer.price_type === 'PERCENTAGE' ? `${offer.price_value || 0}% OFF` : `৳${offer.price_value || 0}`}
                                        </td>
                                        <td className="p-5 text-center">
                                        <span className={`px-2 py-1 rounded text-[8px] font-black border ${offer.status === 'LIVE' || !offer.status ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                                            {offer.status || 'LIVE'}
                                        </span>
                                        </td>
                                        <td className="p-5 text-center">
                                            <button
                                                onClick={() => toggleFeeStatus(offer._id, offer.status || 'LIVE')}
                                                className={`text-[8px] px-3 py-1 rounded border ${offer.status === 'LIVE' || !offer.status ? 'text-red-400 border-red-500/30 hover:bg-red-500/10' : 'text-green-400 border-green-500/30 hover:bg-green-500/10'}`}
                                            >
                                                MARK {offer.status === 'LIVE' || !offer.status ? 'CLOSE' : 'LIVE'}
                                            </button>
                                        </td>
                                    </tr>
                                )})}
                            {displayedOffers.length === 0 && (
                                <tr><td colSpan="8" className="p-8 text-center text-gray-600 text-xs italic tracking-widest">No promotional offers match filter.</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LicenseFee;