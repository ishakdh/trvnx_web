import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BD_DATA } from '../../utils/bd_geo.js';

const SRDashboard = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });

    const [shopkeepers, setShopkeepers] = useState([]);
    const [devices, setDevices] = useState([]);
    const [commissions, setCommissions] = useState([]);
    const [srBalance, setSrBalance] = useState(user.balance || 0);

    const [isMarketingMenuOpen, setIsMarketingMenuOpen] = useState(false);
    const [marketingTargets, setMarketingTargets] = useState([]);
    const [targetSearchTerm, setTargetSearchTerm] = useState('');
    const [targetFilterStart, setTargetFilterStart] = useState('');
    const [targetFilterEnd, setTargetFilterEnd] = useState('');
    const [currentTargetPage, setCurrentTargetPage] = useState(1);
    const TARGETS_PER_PAGE = 50;

    // 🚀 NEW: Home Graph Filter State
    const [homeGraphFilter, setHomeGraphFilter] = useState('THIS_MONTH');
    const [timeFilter, setTimeFilter] = useState('ALL');
    const [monthFilter, setMonthFilter] = useState('ALL');

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const ITEMS_PER_PAGE = 50;
    const [shopPage, setShopPage] = useState(1);
    const [devicePage, setDevicePage] = useState(1);
    const [commPage, setCommPage] = useState(1);

    const [shopForm, setShopForm] = useState({
        business_name: '', password: '', name: '', nid_number: '',
        father_name: '', mother_name: '', address1: '', address2: '',
        phone1: '', phone2: '', division: '', district: '', thana: ''
    });

    const [files, setFiles] = useState({ photo: null, nid: null, trade_license: null });

    // 🚀 NEW STATE: Payout Request Modal
    const [payoutModal, setPayoutModal] = useState({ isOpen: false, amount: 0 });

    const allDivisions = Object.keys(BD_DATA);
    const availableDistricts = shopForm.division ? Object.keys(BD_DATA[shopForm.division]) : [];
    let availableThanas = [];
    if (shopForm.division && shopForm.district && BD_DATA[shopForm.division][shopForm.district]) {
        availableThanas = [...BD_DATA[shopForm.division][shopForm.district]];
        availableThanas.sort();
    }

    const myIdStr = String(user.id || user._id);

    const fetchData = async () => {
        setLoading(true);
        try {
            const shopRes = await fetch('http://localhost:5000/api/auth/operators', { headers: { 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` } });
            const shopData = await shopRes.json();
            const allUsers = Array.isArray(shopData) ? shopData : (shopData.users || shopData.data || []);

            const myLiveProfile = allUsers.find(u => String(u._id) === myIdStr);
            if (myLiveProfile) setSrBalance(myLiveProfile.balance || 0);

            const myShops = allUsers.filter(op => op.role === 'SHOPKEEPER' && (String(op.parent_id) === myIdStr || String(op.createdBy) === myIdStr));
            setShopkeepers(myShops);

            const devRes = await fetch('http://localhost:5000/api/devices/all', { headers: { 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` } });
            const devData = await devRes.json();
            const allDevs = devData.devices || [];
            const myShopIds = myShops.map(s => String(s._id));
            setDevices(allDevs.filter(d => myShopIds.includes(String(d.shopkeeper_id?._id || d.shopkeeper_id))));

            const commRes = await fetch('http://localhost:5000/api/transactions/sr/commissions', { headers: { 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` } });
            if (commRes.ok) {
                const commData = await commRes.json();
                const ledgerRows = Array.isArray(commData) ? commData : (commData.data || []);
                setCommissions(ledgerRows);
            }

            const targetRes = await fetch('http://localhost:5000/api/marketing/targets', { headers: { 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` } });
            if (targetRes.ok) {
                const targetData = await targetRes.json();
                const myTargets = (Array.isArray(targetData) ? targetData : (targetData.data || [])).filter(t => String(t.sr_id) === myIdStr || t.target_level === 'SR');
                setMarketingTargets(myTargets);
            }
        } catch (err) { console.error("FETCH_ERROR:", err); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [activeTab]);

    const handleRegisterShop = async (e) => {
        e.preventDefault();

        const payload = {
            name: shopForm.name,
            business_name: shopForm.business_name,
            phone: shopForm.phone1,
            phone_alt: shopForm.phone2,
            password: shopForm.password,
            nid_number: shopForm.nid_number,
            father_name: shopForm.father_name,
            mother_name: shopForm.mother_name,
            role: 'SHOPKEEPER',
            parent_id: myIdStr,
            createdBy: myIdStr,
            address: {
                line1: shopForm.address1,
                line2: shopForm.address2,
                division: shopForm.division,
                district: shopForm.district,
                thana: shopForm.thana
            },
            approval: { status: 'WAITING_DISTRIBUTOR', requested_at: new Date() },
            temporary_licenses: 10
        };

        try {
            const response = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert(`✅ RETAILER NODE DEPLOYED: Shop successfully linked to your SR account.`);
                setShopForm({ business_name: '', password: '', name: '', nid_number: '', father_name: '', mother_name: '', address1: '', address2: '', phone1: '', phone2: '', division: '', district: '', thana: '' });
                setActiveTab('shopkeeper');
            } else {
                const err = await response.json();
                alert(`❌ DEPLOYMENT FAILED: ${err.message}`);
            }
        } catch (err) { alert("⚠️ SYSTEM_OFFLINE"); }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.new !== passwordForm.confirm) return alert("❌ PASSWORDS DO NOT MATCH.");
        if (passwordForm.new.length < 6) return alert("❌ PASSWORD MUST BE AT LEAST 6 CHARACTERS.");

        try {
            const res = await fetch('http://localhost:5000/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify({ newPassword: passwordForm.new })
            });
            if (res.ok) {
                alert("✅ PASSWORD UPDATED SUCCESSFULLY.");
                setShowPasswordModal(false);
                setPasswordForm({ new: '', confirm: '' });
            } else {
                alert("❌ FAILED TO UPDATE PASSWORD.");
            }
        } catch (err) { alert("⚠️ SYSTEM OFFLINE."); }
    };

    const handleFileChange = (e, type) => { setFiles({ ...files, [type]: e.target.files[0] }); };

    // 🚀 NEW: Dynamic Threshold Logic (5000 OR End of Month)
    const today = new Date();
    const isEndOfMonth = today.getDate() === new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const canRequestPayout = srBalance >= 5000 || isEndOfMonth;

    // 🚀 NEW: Submit Payout Request with specific amount
    const handleRequestPayoutSubmit = async (e) => {
        e.preventDefault();
        const requestAmount = Number(payoutModal.amount);
        if (requestAmount > srBalance || requestAmount <= 0) return alert("❌ INVALID AMOUNT.");

        try {
            const res = await fetch('http://localhost:5000/api/transactions/sr-request-payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify({ amount: requestAmount })
            });
            if (res.ok) {
                alert(`✅ PAYOUT REQUESTED: ৳${requestAmount} has been deducted from your wallet. Your Distributor has been notified.`);
                setPayoutModal({ isOpen: false, amount: 0 });
                fetchData(); // Sync live balance
            } else {
                alert("❌ Request denied.");
            }
        } catch (err) { alert("⚠️ SYSTEM_OFFLINE"); }
    };

    const filterByDate = (items, dateField = 'createdAt') => items.filter(item => {
        if (!startDate && !endDate) return true;
        const itemDate = new Date(item[dateField] || item.date).setHours(0,0,0,0);
        const s = startDate ? new Date(startDate).setHours(0,0,0,0) : null;
        const e = endDate ? new Date(endDate).setHours(23,59,59,999) : null;
        if (s && e) return itemDate >= s && itemDate <= end;
        if (s) return itemDate >= s;
        if (e) return itemDate <= e;
        return true;
    });

    const downloadPDF = (title, columns, data) => {
        if (data.length === 0) return alert("No data to download.");
        const doc = new jsPDF();
        doc.setFillColor(10, 17, 40);
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text(`Lindux EMI: ${title.toUpperCase()}`, 15, 15);
        doc.setFontSize(9);
        doc.text(`Date Range: ${startDate || 'All Time'} to ${endDate || 'All Time'}`, 15, 22);

        autoTable(doc, {
            startY: 35,
            head: [columns],
            body: data,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] }
        });
        doc.save(`LINDUX_EMI_${title.replace(' ', '_')}.pdf`);
    };

    const filteredShops = filterByDate(shopkeepers);
    const paginatedShops = filteredShops.slice((shopPage - 1) * ITEMS_PER_PAGE, shopPage * ITEMS_PER_PAGE);

    const filteredDevices = filterByDate(devices);
    const paginatedDevices = filteredDevices.slice((devicePage - 1) * ITEMS_PER_PAGE, devicePage * ITEMS_PER_PAGE);

    const filteredCommissions = filterByDate(commissions);
    const paginatedCommissions = filteredCommissions.slice((commPage - 1) * ITEMS_PER_PAGE, commPage * ITEMS_PER_PAGE);

    const filteredMarketingTargets = marketingTargets.filter(t => {
        let match = true;
        if (targetSearchTerm) match = match && (t.shop_name?.toLowerCase().includes(targetSearchTerm.toLowerCase()));
        if (targetFilterStart) match = match && new Date(t.start_date) >= new Date(targetFilterStart);
        if (targetFilterEnd) match = match && new Date(t.end_date) <= new Date(targetFilterEnd);
        return match;
    });

    // 🚀 FIXED: Strict Unit Calculator (Ignores Price completely)
    const calculatedMarketingTargets = filteredMarketingTargets.map(t => {
        let idCount = 0;
        let licCount = 0;

        if (devices && devices.length > 0) {
            const sDate = t.start_date ? new Date(t.start_date).setHours(0,0,0,0) : 0;
            const eDate = t.end_date ? new Date(t.end_date).setHours(23,59,59,999) : Infinity;

            devices.forEach(d => {
                const dDate = new Date(d.createdAt).getTime();
                if (dDate >= sDate && dDate <= eDate) {
                    idCount += 1;
                    licCount += 1;
                }
            });
        }

        return {
            ...t,
            dynamic_id_achieved: idCount,
            dynamic_license_achieved: licCount
        };
    });

    const paginatedMarketingTargets = calculatedMarketingTargets.slice((currentTargetPage - 1) * TARGETS_PER_PAGE, currentTargetPage * TARGETS_PER_PAGE);

    const totalTargetAmt = calculatedMarketingTargets.reduce((sum, t) => sum + (Number(t.id_target || t.idTarget) || 0), 0);
    const totalSalesAmt = calculatedMarketingTargets.reduce((sum, t) => sum + (Number(t.dynamic_id_achieved) || 0), 0);
    const totalAchievePct = totalTargetAmt ? ((totalSalesAmt / totalTargetAmt) * 100).toFixed(2) : 0;

    const graphData = calculatedMarketingTargets.length > 0 ? calculatedMarketingTargets.map((t, i) => ({
        name: `T${i+1}`,
        Target: Number(t.id_target || t.idTarget || 0),
        Achievement: Number(t.dynamic_id_achieved || 0)
    })) : [
        { name: 'No Data', Target: 0, Achievement: 0 }
    ];

    // 🚀 UPDATED: Home Graph Calculation Logic strictly tracking Units and matching the filter state
    const homeFilteredTargets = marketingTargets.filter(t => {
        if (!t.start_date) return true;
        const targetDate = new Date(t.start_date);
        const now = new Date();

        if (homeGraphFilter === 'THIS_MONTH') {
            if (targetDate.getMonth() !== now.getMonth() || targetDate.getFullYear() !== now.getFullYear()) return false;
        } else if (homeGraphFilter === 'LAST_DAY') {
            if (targetDate < new Date(now.getTime() - (24 * 60 * 60 * 1000))) return false;
        } else if (homeGraphFilter === 'LAST_7_DAYS') {
            if (targetDate < new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))) return false;
        } else if (homeGraphFilter === 'LAST_15_DAYS') {
            if (targetDate < new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000))) return false;
        }

        return true;
    });

    let homeTotalTargetAmt = 0;
    let homeTotalSalesAmt = 0;

    const homeGraphData = homeFilteredTargets.length > 0 ? homeFilteredTargets.map((t, i) => {
        const targetAmt = Number(t.id_target || t.idTarget || 0);
        let achieveAmt = 0;
        const sDate = t.start_date ? new Date(t.start_date).setHours(0,0,0,0) : 0;
        const eDate = t.end_date ? new Date(t.end_date).setHours(23,59,59,999) : Infinity;

        if (devices && devices.length > 0) {
            devices.forEach(d => {
                const dDate = new Date(d.createdAt).getTime();
                if (dDate >= sDate && dDate <= eDate) {
                    achieveAmt += 1;
                }
            });
        }

        homeTotalTargetAmt += targetAmt;
        homeTotalSalesAmt += achieveAmt;

        return {
            name: `T${i+1}`,
            Target: targetAmt,
            Achievement: achieveAmt
        };
    }) : [{ name: 'No Data', Target: 0, Achievement: 0 }];

    const homeTotalAchievePct = homeTotalTargetAmt > 0 ? ((homeTotalSalesAmt / homeTotalTargetAmt) * 100).toFixed(2) : 0;

    // 🚀 FIXED: Sent properly formatted mapping so backend doesn't drop license_target
    const handleCreateTarget = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...targetForm,
                target_name: targetForm.name,
                start_date: targetForm.startDate,
                end_date: targetForm.endDate,
                id_target: Number(targetForm.idTarget) || 0,
                target_amount: Number(targetForm.idTarget) || 0,
                license_target: Number(targetForm.licenseTarget) || 0,
                bonus_amount: Number(targetForm.bonus) || 0,
                created_by: myIdStr,
                target_level: 'SR'
            };
            const res = await fetch('http://localhost:5000/api/marketing/create-target', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("✅ SR MARKETING TARGET DEPLOYED.");
                setTargetForm({ name: '', startDate: '', endDate: '', markets: [], idTarget: '', licenseTarget: '', bonus: '' });
                fetchExtendedData();
                setActiveTab('marketing_targets');
            } else { alert("Failed to deploy target."); }
        } catch (err) { console.error(err); }
    };

    return (
        <div className="min-h-screen bg-[#050A15] text-white font-mono flex relative overflow-hidden uppercase font-bold">

            {/* SIDEBAR */}
            <aside
                className={`${isSidebarOpen ? 'w-64' : 'w-12 px-2'} shrink-0 transition-all duration-300 ease-in-out bg-[#0A1128] border-r border-[#273A60] flex flex-col z-20 whitespace-nowrap overflow-hidden`}
                onMouseEnter={() => setIsSidebarOpen(true)}
                onMouseLeave={() => setIsSidebarOpen(false)}
            >
                <div className="p-6 border-b border-[#273A60] flex justify-between items-center h-[85px] shrink-0">
                    <div>
                        <h2 className="text-lg font-black tracking-tighter text-blue-500 italic">Lindux EMI</h2>
                        <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-1">FIELD_OPERATIVE (SR)</p>
                    </div>
                </div>
                <div className="p-6 flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar">
                    <button onClick={() => setActiveTab('home')} className={`px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all flex items-center gap-4 ${activeTab === 'home' ? 'bg-[#0F172A] text-blue-400 border-l-4 border-blue-500' : 'text-gray-500 hover:bg-gray-800'}`}>
                        <span className="text-sm">🏠</span>
                        {isSidebarOpen && <span>HOME</span>}
                    </button>
                    <button onClick={() => setActiveTab('create_id')} className={`px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all flex items-center gap-4 ${activeTab === 'create_id' ? 'bg-[#0F172A] text-orange-400 border-l-4 border-orange-500' : 'text-gray-500 hover:bg-gray-800'}`}>
                        <span className="text-sm">➕</span>
                        {isSidebarOpen && <span>CREATE ID</span>}
                    </button>
                    <button onClick={() => setActiveTab('sr_ac')} className={`px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all flex items-center gap-4 ${activeTab === 'sr_ac' ? 'bg-[#0F172A] text-green-400 border-l-4 border-green-500' : 'text-gray-500 hover:bg-gray-800'}`}>
                        <span className="text-sm">💳</span>
                        {isSidebarOpen && <span>SR A/C (INCOME)</span>}
                    </button>
                    <button onClick={() => setActiveTab('shopkeeper')} className={`px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all flex items-center gap-4 ${activeTab === 'shopkeeper' ? 'bg-[#0F172A] text-blue-400 border-l-4 border-blue-500' : 'text-gray-500 hover:bg-gray-800'}`}>
                        <span className="text-sm">🛒</span>
                        {isSidebarOpen && <span>SHOPKEEPER DIRECTORY</span>}
                    </button>
                    <button onClick={() => setActiveTab('device')} className={`px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all flex items-center gap-4 ${activeTab === 'device' ? 'bg-[#0F172A] text-teal-400 border-l-4 border-teal-500' : 'text-gray-500 hover:bg-gray-800'}`}>
                        <span className="text-sm">📱</span>
                        {isSidebarOpen && <span>ALL DEVICES</span>}
                    </button>

                    <div className="flex flex-col">
                        <button onClick={() => setIsMarketingMenuOpen(!isMarketingMenuOpen)} className={`px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all flex justify-between items-center ${activeTab.startsWith('marketing_') ? 'text-pink-400' : 'text-gray-500 hover:bg-gray-800'}`}>
                            <div className="flex items-center gap-4">
                                <span className="text-sm">📈</span>
                                {isSidebarOpen && <span>MARKETING</span>}
                            </div>
                            {isSidebarOpen && <span>{isMarketingMenuOpen ? '▼' : '▶'}</span>}
                        </button>
                        {isMarketingMenuOpen && isSidebarOpen && (
                            <div className="ml-4 pl-4 border-l border-pink-900/40 flex flex-col gap-1 mt-1">
                                <button onClick={() => setActiveTab('marketing_targets')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'marketing_targets' ? 'text-pink-300 bg-pink-500/10' : 'text-gray-600 hover:text-pink-400 transition-colors'}`}>TARGET & ACHIEVEMENT</button>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-8 pb-4 flex flex-col gap-2">
                        <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center gap-4 px-4 py-3 text-gray-500 hover:text-white transition-all text-[10px] font-bold tracking-widest">
                            <span className="text-sm">🔒</span>
                            {isSidebarOpen && <span>CHANGE PASSWORD</span>}
                        </button>
                        <button onClick={onLogout} className="w-full bg-red-900/10 text-red-500 border border-red-900/50 px-4 py-3 rounded text-[10px] font-black text-left hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest flex items-center gap-4">
                            <span className="text-sm">⏻</span>
                            {isSidebarOpen && <span>LOGOUT</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
                <header className="flex justify-between items-center p-4 md:px-8 border-b border-[#273A60] bg-[#050A15] shrink-0 h-[85px]">
                    <div className="flex items-center gap-4">
                        <div className="text-3xl text-gray-500 hover:text-white transition-colors mb-1">≡</div>
                        <div>
                            <h1 className="text-xl font-black text-blue-500 uppercase tracking-tighter italic">LINDUX EMI FIELD CONTROL CENTER</h1>
                            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Identity: {user.name} | Wallet: ৳{srBalance.toLocaleString()}</p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">

                    {!['home', 'sr_create', 'marketing_create', 'marketing_targets'].includes(activeTab) && (
                        <div className="flex flex-col md:flex-row justify-between items-center bg-[#0A1128] p-4 rounded border border-[#273A60] mb-6 gap-4 shadow-lg">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <label className="text-[8px] text-gray-500 font-black tracking-widest mb-1">From Date</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-blue-300 outline-none" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[8px] text-gray-500 font-black tracking-widest mb-1">To Date</label>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-blue-300 outline-none" />
                                </div>
                                <button onClick={() => { setStartDate(''); setEndDate(''); }} className="bg-gray-800 text-gray-400 hover:text-white px-3 py-2 rounded text-[9px] font-black mt-4">CLEAR</button>
                            </div>
                        </div>
                    )}

                    {/* 🚀 NEW: HOME TAB WITH GRAPH */}
                    {activeTab === 'home' && (
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-center bg-[#0A1128] p-4 rounded border border-[#273A60] shadow-lg gap-4">
                                <div className="text-pink-400 text-xs font-black tracking-[0.2em] uppercase">SR TARGET MATRIX</div>
                                <div className="flex gap-2">
                                    {['LAST_DAY', 'LAST_7_DAYS', 'LAST_15_DAYS', 'THIS_MONTH'].map(filter => (
                                        <button
                                            key={filter}
                                            onClick={() => setHomeGraphFilter(filter)}
                                            className={`px-4 py-2 rounded text-[9px] font-black transition-all shadow-md ${homeGraphFilter === filter ? 'bg-pink-600 text-white' : 'bg-[#111A35] text-gray-400 border border-[#273A60] hover:text-pink-400'}`}
                                        >
                                            {filter.replace(/_/g, ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row bg-[#0A1128] border border-[#273A60] rounded shadow-2xl p-4 gap-6">
                                <div className="w-full md:w-2/3 h-64 border border-[#162447] rounded relative bg-[#050A15]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={homeGraphData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorTargetHome" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorAchieveHome" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#273A60" vertical={false} />
                                            <XAxis dataKey="name" stroke="#6b7280" tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                            <YAxis stroke="#6b7280" tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{backgroundColor: '#0A1128', borderColor: '#273A60', fontSize: '10px', borderRadius: '8px'}} itemStyle={{fontFamily: 'monospace'}} />
                                            <Area type="monotone" dataKey="Target" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorTargetHome)" />
                                            <Area type="monotone" dataKey="Achievement" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorAchieveHome)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full md:w-1/3 flex flex-col justify-center gap-4">
                                    <div className="bg-[#111A35] p-5 rounded border border-[#273A60] shadow-inner">
                                        <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] mb-2 font-bold">Target Units</p>
                                        <h3 className="text-3xl font-black text-green-400 font-mono">{homeTotalTargetAmt.toLocaleString()}</h3>
                                    </div>
                                    <div className="bg-[#111A35] p-5 rounded border border-[#273A60] shadow-inner">
                                        <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] mb-2 font-bold">Achievement Units</p>
                                        <h3 className="text-3xl font-black text-pink-400 font-mono">{homeTotalSalesAmt.toLocaleString()}</h3>
                                    </div>
                                    <div className="bg-[#111A35] p-5 rounded border border-[#273A60] shadow-inner">
                                        <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] mb-2 font-bold">% of Achievement</p>
                                        <h3 className="text-2xl font-black text-white font-mono">{homeTotalAchievePct}%</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 1: CREATE ID (SHOPKEEPER) */}
                    {activeTab === 'create_id' && (
                        <div className="max-w-4xl mx-auto">
                            <form onSubmit={handleRegisterShop} className="bg-[#111A35] p-8 border border-orange-900/30 rounded shadow-2xl space-y-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                                <h3 className="text-orange-400 font-black text-xs uppercase tracking-[0.2em] border-b border-[#273A60] pb-4 italic tracking-widest">Deploy New Retail Node (Shopkeeper)</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-gray-500 tracking-widest">Shop Name</label>
                                        <input required type="text" className="w-full bg-black border border-[#273A60] p-3 text-xs" value={shopForm.business_name} onChange={e => setShopForm({...shopForm, business_name: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-gray-500 tracking-widest">Assign Password</label>
                                        <input required type="text" className="w-full bg-black border border-[#273A60] p-3 text-xs" value={shopForm.password} onChange={e => setShopForm({...shopForm, password: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-gray-500 tracking-widest">Shop Owner Name</label>
                                        <input required type="text" className="w-full bg-black border border-[#273A60] p-3 text-xs" value={shopForm.name} onChange={e => setShopForm({...shopForm, name: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-gray-500 tracking-widest">NID Number</label>
                                        <input required type="text" className="w-full bg-black border border-[#273A60] p-3 text-xs" value={shopForm.nid_number} onChange={e => setShopForm({...shopForm, nid_number: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-gray-500 tracking-widest">Father's Name</label>
                                        <input required type="text" className="w-full bg-black border border-[#273A60] p-3 text-xs" value={shopForm.father_name} onChange={e => setShopForm({...shopForm, father_name: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-gray-500 tracking-widest">Mother's Name</label>
                                        <input required type="text" className="w-full bg-black border border-[#273A60] p-3 text-xs" value={shopForm.mother_name} onChange={e => setShopForm({...shopForm, mother_name: e.target.value})} />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-[#273A60]">
                                    <p className="text-[9px] text-blue-500 font-black tracking-widest">Contact & Address</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input required type="text" placeholder="Primary Phone" className="w-full bg-black border border-[#273A60] p-3 text-xs" value={shopForm.phone1} onChange={e => setShopForm({...shopForm, phone1: e.target.value})} />
                                        <input type="text" placeholder="Alternative Phone (Optional)" className="w-full bg-black border border-[#273A60] p-3 text-xs" value={shopForm.phone2} onChange={e => setShopForm({...shopForm, phone2: e.target.value})} />
                                        <input required type="text" placeholder="Address Line 1" className="w-full bg-black border border-[#273A60] p-3 text-xs md:col-span-2" value={shopForm.address1} onChange={e => setShopForm({...shopForm, address1: e.target.value})} />
                                        <input type="text" placeholder="Address Line 2" className="w-full bg-black border border-[#273A60] p-3 text-xs md:col-span-2" value={shopForm.address2} onChange={e => setShopForm({...shopForm, address2: e.target.value})} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#273A60]">
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-gray-500 tracking-widest">Division (Your Territory)</label>
                                        <select required className="w-full bg-black border border-[#273A60] p-3 text-xs text-orange-300" value={shopForm.division} onChange={e => setShopForm({...shopForm, division: e.target.value, district: '', thana: ''})}>
                                            <option value="">Select Division</option>
                                            {allDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-gray-500 tracking-widest">District (Your Territory)</label>
                                        <select required disabled={!shopForm.division} className="w-full bg-black border border-[#273A60] p-3 text-xs text-orange-300" value={shopForm.district} onChange={e => setShopForm({...shopForm, district: e.target.value, thana: ''})}>
                                            <option value="">Select District</option>
                                            {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-gray-500 tracking-widest">Thana (Your Territory)</label>
                                        <select required disabled={!shopForm.district} className="w-full bg-black border border-[#273A60] p-3 text-xs text-orange-300" value={shopForm.thana} onChange={e => setShopForm({...shopForm, thana: e.target.value})}>
                                            <option value="">Select Thana</option>
                                            {availableThanas.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-[#273A60]">
                                    <p className="text-[9px] text-teal-500 font-black tracking-widest">Documents (Optional - direct capture supported on mobile)</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1 border border-dashed border-[#273A60] p-4 text-center hover:bg-[#162447] cursor-pointer">
                                            <label className="text-[9px] text-gray-400 cursor-pointer block">Upload Photo<input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileChange(e, 'photo')} /></label>
                                            {files.photo && <span className="text-[8px] text-green-500 block mt-2">File Attached</span>}
                                        </div>
                                        <div className="space-y-1 border border-dashed border-[#273A60] p-4 text-center hover:bg-[#162447] cursor-pointer">
                                            <label className="text-[9px] text-gray-400 cursor-pointer block">Upload NID<input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileChange(e, 'nid')} /></label>
                                            {files.nid && <span className="text-[8px] text-green-500 block mt-2">File Attached</span>}
                                        </div>
                                        <div className="space-y-1 border border-dashed border-[#273A60] p-4 text-center hover:bg-[#162447] cursor-pointer">
                                            <label className="text-[9px] text-gray-400 cursor-pointer block">Upload Trade License<input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileChange(e, 'trade_license')} /></label>
                                            {files.trade_license && <span className="text-[8px] text-green-500 block mt-2">File Attached</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-orange-900/20 border border-orange-500/20 p-4 rounded text-[9px] text-orange-300 font-mono italic">
                                    Notice: Submitting this form will grant the shopkeeper 10 temporary license keys and immediately alert your assigned Distributor for approval.
                                </div>

                                <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 py-5 rounded text-[11px] font-black tracking-[0.4em] transition-all shadow-xl shadow-orange-900/40">INITIALIZE RETAILER & REQUEST APPROVAL</button>
                            </form>
                        </div>
                    )}

                    {/* TAB 2: SR A/C (INCOME) */}
                    {activeTab === 'sr_ac' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-[#0A1128] p-4 rounded border border-[#273A60] mb-4 shadow-lg">
                                <div>
                                    <p className="text-[8px] text-gray-500 font-black tracking-widest uppercase">Total Owed by Distributor</p>
                                    <h2 className="text-2xl font-black text-green-400 font-mono">৳{srBalance.toLocaleString()}</h2>
                                    {!canRequestPayout && <p className="text-[8px] text-red-400 mt-1">Payout locked. Min ৳5000 or End of Month.</p>}
                                </div>
                                <button onClick={() => setPayoutModal({isOpen: true, amount: srBalance})} disabled={!canRequestPayout} className={`px-6 py-3 rounded text-[10px] font-black tracking-widest shadow-lg transition-all ${canRequestPayout ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/30 animate-pulse' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
                                    REQUEST PAYOUT
                                </button>
                            </div>

                            <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl">
                                <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                    <h3 className="text-xs font-bold tracking-widest text-green-400">SR Earnings Ledger (Deducted from Distributor)</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => downloadPDF('SR_Income_Statement', ['Date', 'Description', 'Amount'], paginatedCommissions.map(c => [new Date(c.date || c.createdAt).toLocaleDateString(), c.description, `BDT ${c.amount}`]))} className="text-[9px] bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded transition-all">📄 PDF</button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[9px] whitespace-nowrap">
                                        <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                                        <tr>
                                            <th className="p-4">Date</th>
                                            <th className="p-4">Description / Source Shop</th>
                                            <th className="p-4 text-right">Earned Amount</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#162447]">
                                        {paginatedCommissions.map((comm, idx) => (
                                            <tr key={idx} className="hover:bg-green-900/5 transition-colors">
                                                <td className="p-4 text-gray-400">{new Date(comm.date || comm.createdAt).toLocaleDateString()}</td>
                                                <td className="p-4 text-gray-300">{comm.description || 'Commission Allocation'}</td>
                                                <td className="p-4 text-right text-green-400 font-mono text-xs">৳{comm.amount}</td>
                                            </tr>
                                        ))}
                                        {paginatedCommissions.length === 0 && (
                                            <tr><td colSpan="3" className="p-8 text-center text-gray-600 italic">No commission records found. Note: Payment releases are managed strictly by your Distributor.</td></tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-4 bg-[#050A15] border-t border-[#273A60] flex justify-between items-center text-[9px] text-gray-500 font-black">
                                    <button onClick={() => setCommPage(p => Math.max(1, p - 1))} className="hover:text-white">◀ PREV</button>
                                    <span>PAGE {commPage} OF {Math.ceil(filteredCommissions.length / ITEMS_PER_PAGE) || 1}</span>
                                    <button onClick={() => setCommPage(p => Math.min(Math.ceil(filteredCommissions.length / ITEMS_PER_PAGE) || 1, p + 1))} className="hover:text-white">NEXT ▶</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: MARKETING > TARGET & ACHIEVEMENT */}
                    {activeTab === 'marketing_targets' && (
                        <div className="space-y-4">
                            <div className="flex flex-col md:flex-row bg-[#0A1128] border border-[#273A60] rounded shadow-2xl p-4 gap-6">
                                <div className="w-full md:w-2/3 h-48 border border-[#162447] rounded relative bg-[#050A15]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorAchieve" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#273A60" />
                                            <XAxis dataKey="name" stroke="#6b7280" tick={{fontSize: 8}} />
                                            <YAxis stroke="#6b7280" tick={{fontSize: 8}} />
                                            <Tooltip contentStyle={{backgroundColor: '#0A1128', borderColor: '#273A60', fontSize: '10px'}} />
                                            <Area type="monotone" dataKey="Target" stroke="#10b981" fillOpacity={1} fill="url(#colorTarget)" />
                                            <Area type="monotone" dataKey="Achievement" stroke="#f43f5e" fillOpacity={1} fill="url(#colorAchieve)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full md:w-1/3 flex flex-col justify-center gap-4">
                                    <div className="bg-[#111A35] p-4 rounded border border-[#273A60]">
                                        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Target Units</p>
                                        <h3 className="text-2xl font-black text-green-400 font-mono">{totalTargetAmt.toLocaleString()}</h3>
                                    </div>
                                    <div className="bg-[#111A35] p-4 rounded border border-[#273A60]">
                                        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Achievement Units</p>
                                        <h3 className="text-2xl font-black text-pink-400 font-mono">{totalSalesAmt.toLocaleString()}</h3>
                                    </div>
                                    <div className="bg-[#111A35] p-4 rounded border border-[#273A60]">
                                        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">% of Achievement</p>
                                        <h3 className="text-xl font-black text-white font-mono">{totalAchievePct}%</h3>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row justify-between items-center bg-[#0A1128] p-4 rounded border border-[#273A60] gap-4">
                                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                                    <div className="flex items-center bg-[#050A15] border border-[#273A60] px-3 py-2 rounded">
                                        <span className="text-gray-500 mr-2">🔍</span>
                                        <input type="text" placeholder="Search Shop Name..." value={targetSearchTerm} onChange={(e) => setTargetSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-600 font-bold uppercase w-full md:w-48" />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">From</label>
                                        <input type="date" className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-pink-300 outline-none uppercase font-bold" value={targetFilterStart} onChange={(e) => setTargetFilterStart(e.target.value)} />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">To</label>
                                        <input type="date" className="bg-[#050A15] border border-[#273A60] p-2 text-xs text-pink-300 outline-none uppercase font-bold" value={targetFilterEnd} onChange={(e) => setTargetFilterEnd(e.target.value)} />
                                    </div>
                                    <button onClick={() => { setTargetFilterStart(''); setTargetFilterEnd(''); setTargetSearchTerm(''); }} className="bg-gray-800 text-gray-400 hover:text-white px-3 py-2 rounded text-[9px] font-black tracking-widest transition-colors uppercase mt-4">CLEAR</button>
                                </div>
                                <div className="text-[9px] font-bold text-gray-500 flex gap-4 pr-4 uppercase tracking-widest">
                                    <button onClick={() => setCurrentTargetPage(prev => Math.max(prev - 1, 1))} className="hover:text-white transition-colors">◀ PREV</button>
                                    <span>PAGE {currentTargetPage} OF {Math.ceil(filteredMarketingTargets.length / TARGETS_PER_PAGE) || 1}</span>
                                    <button onClick={() => setCurrentTargetPage(prev => Math.min(prev + 1, Math.ceil(filteredMarketingTargets.length / TARGETS_PER_PAGE) || 1))} className="hover:text-white transition-colors">NEXT ▶</button>
                                </div>
                            </div>

                            <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl uppercase">
                                <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-pink-300">Target & Achievement Matrix</h3>
                                    <button onClick={() => fetchData()} className="text-[9px] bg-pink-500/20 text-pink-400 px-3 py-1 rounded-full border border-pink-500/30 hover:bg-pink-500/40 transition-all font-black uppercase tracking-widest">↻ SYNC_DATA</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase">
                                        <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                                        <tr>
                                            <th className="p-5">Target Name</th>
                                            <th className="p-5 text-center text-blue-400">ID Target</th>
                                            <th className="p-5 text-center text-green-400">ID Achieved</th>
                                            <th className="p-5 text-center text-teal-400">License Target</th>
                                            <th className="p-5 text-center text-emerald-400">License Achieved</th>
                                            <th className="p-5 text-center">Status %</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#162447]">
                                        {paginatedMarketingTargets.map((t) => {
                                            // 🚀 FIXED: Ignore target_amount so it doesn't show 300,000
                                            const idTarget = Number(t.id_target || t.idTarget || 0);
                                            const idAchieved = Number(t.dynamic_id_achieved || 0);
                                            const idPct = idTarget > 0 ? ((idAchieved / idTarget) * 100).toFixed(1) : 0;

                                            const licTarget = Number(t.license_target ?? t.licenseTarget ?? 0);
                                            const licAchieved = Number(t.dynamic_license_achieved || 0);

                                            return (
                                                <tr key={t._id || Math.random()} className="hover:bg-pink-900/5 transition-colors font-bold">
                                                    <td className="p-5 text-white">
                                                        {t.target_name || t.name}
                                                        <div className="text-[7px] text-gray-500 mt-1">
                                                            {new Date(t.start_date).toLocaleDateString('en-GB')} - {new Date(t.end_date).toLocaleDateString('en-GB')}
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-blue-400 text-center font-mono">{idTarget.toLocaleString()}</td>
                                                    <td className="p-5 text-green-400 text-center font-mono">{idAchieved.toLocaleString()}</td>
                                                    <td className="p-5 text-teal-400 text-center font-mono">{licTarget.toLocaleString()}</td>
                                                    <td className="p-5 text-emerald-400 text-center font-mono">{licAchieved.toLocaleString()}</td>
                                                    <td className="p-5 text-center">
                                                        <span className={`px-2 py-1 rounded ${idPct >= 100 ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>{idPct}%</span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        {paginatedMarketingTargets.length === 0 && (
                                            <tr><td colSpan="6" className="p-8 text-center text-gray-600 text-xs italic tracking-widest">No marketing targets found for this period.</td></tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: SHOPKEEPER DIRECTORY */}
                    {activeTab === 'shopkeeper' && (
                        <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl">
                            <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                <h3 className="text-xs font-bold tracking-widest text-blue-400">My Managed Shopkeepers</h3>
                                <button onClick={() => downloadPDF('My_Shopkeepers', ['Shop Name', 'Owner', 'Phone', 'Approval Status'], paginatedShops.map(s => [s.business_name, s.name, s.phone, s.approval?.status || 'APPROVED']))} className="text-[9px] bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-all">📄 PDF</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[9px] whitespace-nowrap">
                                    <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                                    <tr>
                                        <th className="p-4">Date Added</th>
                                        <th className="p-4">Shop Details</th>
                                        <th className="p-4">Address</th>
                                        <th className="p-4">Contact</th>
                                        <th className="p-4 text-center">Approval Matrix</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#162447]">
                                    {paginatedShops.map((shop) => {
                                        let statusColor = "text-green-500";
                                        let statusText = shop.approval?.status || "APPROVED";
                                        let isClickable = false;

                                        if (statusText === 'WAITING_DISTRIBUTOR') {
                                            const hoursPassed = Math.abs(new Date() - new Date(shop.approval?.requested_at || shop.createdAt)) / 36e5;
                                            if (hoursPassed > 48) { statusColor = "text-red-500"; statusText = "ESCALATED TO ADMIN"; }
                                            else if (hoursPassed > 24) { statusColor = "text-yellow-500"; statusText = "WAITING > 24H"; }
                                            else { statusColor = "text-orange-500"; statusText = "WAITING DISTRIBUTOR"; }
                                        } else if (statusText === 'WAITING_ADMIN') {
                                            statusColor = "text-red-500";
                                        }

                                        return (
                                            <tr key={shop._id} className="hover:bg-blue-900/5 transition-colors">
                                                <td className="p-4 text-gray-400">{new Date(shop.createdAt).toLocaleDateString()}</td>
                                                <td className="p-4">
                                                    <div className="text-white font-bold">{shop.business_name || 'N/A'}</div>
                                                    <div className="text-[8px] text-gray-500">Owner: {shop.name}</div>
                                                </td>
                                                <td className="p-4 text-gray-400 max-w-[150px] truncate">{shop.address?.thana}, {shop.address?.district}</td>
                                                <td className="p-4 text-blue-300 font-mono">{shop.phone}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2 py-1 rounded text-[8px] font-black border ${statusColor.replace('text', 'bg').replace('500', '900/20')} ${statusColor.replace('text', 'border').replace('500', '500/30')} ${statusColor}`}>
                                                        {statusText}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {paginatedShops.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-600 italic">No shopkeepers deployed in your territory.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 bg-[#050A15] border-t border-[#273A60] flex justify-between items-center text-[9px] text-gray-500 font-black">
                                <button onClick={() => setShopPage(p => Math.max(1, p - 1))} className="hover:text-white">◀ PREV</button>
                                <span>PAGE {shopPage} OF {Math.ceil(filteredShops.length / ITEMS_PER_PAGE) || 1}</span>
                                <button onClick={() => setShopPage(p => Math.min(Math.ceil(filteredShops.length / ITEMS_PER_PAGE) || 1, p + 1))} className="hover:text-white">NEXT ▶</button>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: DEVICE DIRECTORY */}
                    {activeTab === 'device' && (
                        <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl">
                            <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                <h3 className="text-xs font-bold tracking-widest text-teal-400">All Network Devices</h3>
                                <button onClick={() => downloadPDF('Network_Devices', ['Cust Name', 'Cust Phone', 'Device Total', 'Paid'], paginatedDevices.map(d => [d.customer_name, d.customer_phone, `BDT ${d.total_price}`, `BDT ${d.paid_so_far}`]))} className="text-[9px] bg-teal-600 hover:bg-teal-500 text-white px-3 py-1 rounded transition-all">📄 PDF</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[9px] whitespace-nowrap">
                                    <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                                    <tr>
                                        <th className="p-4">Install Date</th>
                                        <th className="p-4">Customer Details</th>
                                        <th className="p-4">Assigned Shop</th>
                                        <th className="p-4 text-right">Price Matrix</th>
                                        <th className="p-4 text-center">Status</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#273A60]">
                                    {paginatedDevices.map((dev) => (
                                        <tr key={dev._id} className="hover:bg-[#111A35] transition-colors">
                                            <td className="p-4 text-gray-400">{new Date(dev.createdAt).toLocaleDateString()}</td>
                                            <td className="p-4">
                                                <div className="text-white font-bold">{dev.customer_name}</div>
                                                <div className="text-gray-500 font-mono">{dev.customer_phone}</div>
                                            </td>
                                            <td className="p-4 text-teal-400">{dev.shopkeeper_id?.name || 'N/A'}</td>
                                            <td className="p-4 text-right">
                                                <div className="text-gray-400">Total: ৳{dev.total_price}</div>
                                                <div className="text-green-500">Paid: ৳{dev.paid_so_far}</div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={dev.is_locked ? 'text-red-500 font-black' : 'text-green-500 font-black'}>● {dev.is_locked ? 'LOCKED' : 'ONLINE'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedDevices.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-600 italic">No devices active under your managed nodes.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 bg-[#050A15] border-t border-[#273A60] flex justify-between items-center text-[9px] text-gray-500 font-black">
                                <button onClick={() => setDevicePage(p => Math.max(1, p - 1))} className="hover:text-white">◀ PREV</button>
                                <span>PAGE {devicePage} OF {Math.ceil(filteredDevices.length / ITEMS_PER_PAGE) || 1}</span>
                                <button onClick={() => setDevicePage(p => Math.min(Math.ceil(filteredDevices.length / ITEMS_PER_PAGE) || 1, p + 1))} className="hover:text-white">NEXT ▶</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 🚀 PAYOUT REQUEST MODAL (SR DASHBOARD) */}
                {payoutModal.isOpen && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[150]">
                        <form onSubmit={handleRequestPayoutSubmit} className="bg-[#111A35] border border-green-500/50 rounded-xl p-8 max-w-sm w-full shadow-2xl relative">
                            <button type="button" onClick={() => setPayoutModal({isOpen: false, amount: 0})} className="absolute top-4 right-4 text-gray-500 hover:text-red-500">✕</button>
                            <h3 className="text-green-400 font-black tracking-widest mb-4">INITIATE PAYOUT REQUEST</h3>
                            <p className="text-[10px] text-gray-400 mb-6">You are requesting funds from your Distributor matrix. You can request your full balance or a partial amount.</p>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="text-[9px] text-gray-500 tracking-widest">Available Balance</label>
                                    <div className="text-white font-mono text-xl font-black">৳{srBalance}</div>
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 tracking-widest">Amount to Withdraw</label>
                                    <input
                                        type="number"
                                        max={srBalance}
                                        required
                                        value={payoutModal.amount}
                                        onChange={e => setPayoutModal({...payoutModal, amount: e.target.value})}
                                        className="w-full bg-black border border-[#273A60] p-3 text-green-400 font-mono font-black"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-green-600 hover:bg-green-500 py-3 rounded font-black tracking-[0.2em] shadow-lg">CONFIRM REQUEST</button>
                        </form>
                    </div>
                )}

                {/* 🚀 CHANGE PASSWORD MODAL */}
                {showPasswordModal && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[500]">
                        <div className="bg-[#111A35] border border-[#273A60] rounded-xl p-8 max-w-md w-full shadow-2xl relative uppercase font-bold">
                            <button onClick={() => setShowPasswordModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl font-black">✕</button>
                            <h3 className="text-xl font-black uppercase text-blue-400 mb-6 border-b border-[#273A60] pb-4 tracking-widest">CHANGE PASSWORD</h3>
                            <form onSubmit={handleChangePassword} className="space-y-4 text-[10px]">
                                <div className="flex flex-col">
                                    <label className="text-gray-500 mb-1 tracking-widest">NEW PASSWORD</label>
                                    <input type="password" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none rounded" required minLength="6" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-gray-500 mb-1 tracking-widest">CONFIRM PASSWORD</label>
                                    <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} className="bg-[#0A1128] border border-[#273A60] p-3 text-white outline-none rounded" required minLength="6" />
                                </div>
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded uppercase tracking-widest shadow-lg mt-4 transition-all">CONFIRM CHANGE</button>
                            </form>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default SRDashboard;