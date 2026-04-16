import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BD_DATA } from '../../utils/bd_geo.js';
import MultiSelectDropdown from "./admin/MultiSelectDropdown.jsx";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear + i);

const DistributorDashboard = ({ user, onLogout }) => {
    const [mySRs, setMySRs] = useState([]);
    const [myShops, setMyShops] = useState([]);
    const [srLiabilities, setSrLiabilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [commissionBalance, setCommissionBalance] = useState(user.balance || 0);

    const [activeTab, setActiveTab] = useState('home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSrMenuOpen, setIsSrMenuOpen] = useState(true);
    const [isFinanceMenuOpen, setIsFinanceMenuOpen] = useState(false);
    const [isMarketingMenuOpen, setIsMarketingMenuOpen] = useState(false);

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });

    const [myDevices, setMyDevices] = useState([]);
    const [financeLedger, setFinanceLedger] = useState([]);
    const [srTransactions, setSrTransactions] = useState([]);
    const [srPayoutRequests, setSrPayoutRequests] = useState([]);

    // 🚀 NEW: Target Creation States
    const [targetMonth, setTargetMonth] = useState(new Date().getMonth());
    const [targetYear, setTargetYear] = useState(currentYear);
    const [isSrDropdownOpen, setIsSrDropdownOpen] = useState(false);

    const [marketingTargets, setMarketingTargets] = useState([]);
    const [targetForm, setTargetForm] = useState({
        name: '', startDate: '', endDate: '', srId: '', idTarget: '', licenseTarget: '', bonus: ''
    });

    const [targetSearchTerm, setTargetSearchTerm] = useState('');
    const [targetFilterName, setTargetFilterName] = useState('');
    const [targetFilterStart, setTargetFilterStart] = useState('');
    const [targetFilterEnd, setTargetFilterEnd] = useState('');
    const [currentTargetPage, setCurrentTargetPage] = useState(1);

    // 🚀 Home Graph Filter States
    const [timeFilter, setTimeFilter] = useState('LAST_15_DAYS');
    const [monthFilter, setMonthFilter] = useState('ALL');

    const ITEMS_PER_PAGE = 50;
    const TARGETS_PER_PAGE = 50;
    const [currentPage, setCurrentPage] = useState({ srDetails: 1, srAc: 1, income: 1, finSrAc: 1, balance: 1, shop: 1, device: 1 });
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

    const [srFormData, setSrFormData] = useState({
        name: '', password: '', fatherName: '', motherName: '',
        address1: '', address2: '', division: '', district: '',
        phone1: '', phone2: '', targetDistrict: '', targetThana: '', marketName: '',
        salary: '', commPerUser: '', commPerLicense: ''
    });

    const [releaseModal, setReleaseModal] = useState({ isOpen: false, reqId: null, srId: null, amount: 0, accountNumber: '', txId: '' });
    const [payoutModal, setPayoutModal] = useState({ isOpen: false, amount: 0 });
    const [shopApproveModal, setShopApproveModal] = useState({ isOpen: false, shop: null });
    const [viewShopModal, setViewShopModal] = useState({ isOpen: false, shop: null });

    const pendingShopCount = myShops.filter(s => s.approval?.status === 'WAITING_DISTRIBUTOR').length;
    const myIdStr = String(user.id || user._id);

    const fetchMyNetwork = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/auth/operators', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` }
            });
            if (!response.ok) throw new Error("Sync Error");
            const data = await response.json();
            const allUsers = Array.isArray(data) ? data : (data.users || data.data || []);

            const myLiveProfile = allUsers.find(u => String(u._id) === myIdStr);
            if (myLiveProfile) setCommissionBalance(myLiveProfile.balance || 0);

            const filteredSRs = allUsers.filter(op => op.role === 'SR' && (String(op.parent_id) === myIdStr || String(op.createdBy) === myIdStr));
            setMySRs(filteredSRs);
            const srIds = filteredSRs.map(sr => String(sr._id));

            const filteredShops = allUsers.filter(op => op.role === 'SHOPKEEPER' && (String(op.parent_id) === myIdStr || String(op.createdBy) === myIdStr || srIds.includes(String(op.parent_id))));
            setMyShops(filteredShops);

            const liabilities = filteredSRs.filter(sr => sr.balance > 0).map(sr => ({ id: sr._id, name: sr.name, phone: sr.phone, amount_owed: sr.balance }));
            setSrLiabilities(liabilities);
        } catch (err) { console.error("NETWORK_SYNC_FAILED:", err); }
        finally { setLoading(false); }
    };

    const fetchExtendedData = async () => {
        try {
            const devRes = await fetch('http://localhost:5000/api/devices/all', { headers: { 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` } });
            if (devRes.ok) {
                const devData = await devRes.json();
                const shopIds = myShops.map(s => String(s._id));
                setMyDevices((devData.devices || []).filter(d => shopIds.includes(String(d.shopkeeper_id?._id || d.shopkeeper_id))));
            }

            const finRes = await fetch('http://localhost:5000/api/admin/finance-ledger', { headers: { 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` } });
            if (finRes.ok) {
                const finData = await finRes.json();
                const ledgerArray = Array.isArray(finData) ? finData : (finData.data || []);

                const myLedger = ledgerArray.filter(tx => String(tx.userId?._id || tx.userId) === myIdStr);
                setFinanceLedger(myLedger);

                const mySrIds = mySRs.map(sr => String(sr._id));

                const requests = ledgerArray.filter(tx => tx.type === 'SR_PAYOUT_REQUEST' && mySrIds.includes(String(tx.userId?._id || tx.userId)));
                setSrPayoutRequests(requests);

                const srFullLedger = ledgerArray.filter(tx =>
                    mySrIds.includes(String(tx.userId?._id || tx.userId)) &&
                    ['COMMISSION', 'SR_COMMISSION', 'SR_PAYOUT', 'SR_PAYOUT_REQUEST'].includes(tx.type)
                );
                setSrTransactions(srFullLedger);
            }

            const targetRes = await fetch('http://localhost:5000/api/marketing/targets', { headers: { 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` } });
            if (targetRes.ok) {
                const targetData = await targetRes.json();
                const allTargets = Array.isArray(targetData) ? targetData : (targetData.data || []);

                // Only show targets deployed by this Distributor OR deployed specifically TO this Distributor
                const myTargets = allTargets.filter(t =>
                    String(t.created_by) === myIdStr || String(t.distributor_id) === myIdStr
                );

                setMarketingTargets(myTargets);
            }
        } catch (error) { console.error("EXTENDED_SYNC_FAILED", error); }
    };

    useEffect(() => { fetchMyNetwork(); }, [user]);
    useEffect(() => { if (!loading) fetchExtendedData(); }, [loading, activeTab, mySRs]);

    // 🚀 NEW: Auto-Generate Target Name & Date Range whenever Month, Year, or SR changes
    useEffect(() => {
        const start = new Date(targetYear, targetMonth, 1);
        const end = new Date(targetYear, targetMonth + 1, 0);

        const startStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`;
        const endStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

        const srUser = mySRs.find(s => String(s._id) === String(targetForm.srId));
        const srName = srUser ? srUser.name.toUpperCase() : 'GLOBAL_SR';

        const yearStr = String(targetYear).slice(-2);
        const monthStr = MONTHS[targetMonth].substring(0, 3).toUpperCase();

        const autoGeneratedName = `${srName}/${yearStr}/${monthStr}`;

        setTargetForm(prev => ({
            ...prev,
            name: autoGeneratedName,
            startDate: startStr,
            endDate: endStr
        }));

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetMonth, targetYear, targetForm.srId, mySRs]);

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
                fetchMyNetwork();
            } else {
                alert("❌ ACTION FAILED.");
            }
        } catch (err) { alert("⚠️ SYSTEM OFFLINE."); }
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
        } catch (err) { alert("⚠️ SYSTEM OFLINE."); }
    };

    const handleReleaseSubmit = async (e) => {
        e.preventDefault();
        if (calculatedBalance < releaseModal.amount) return alert("❌ INSUFFICIENT BALANCE: You do not have enough funds to clear this liability.");

        try {
            const res = await fetch('http://localhost:5000/api/admin/release-sr-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify({
                    srId: releaseModal.srId,
                    amount: releaseModal.amount,
                    requestId: releaseModal.reqId,
                    accountNumber: releaseModal.accountNumber,
                    txId: releaseModal.txId
                })
            });
            if (res.ok) {
                const data = await res.json();
                alert(`✅ PAYMENT COMPLETED: ৳${releaseModal.amount} deducted from your balance.`);

                const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a5' });
                doc.setFillColor(10, 17, 40); doc.rect(0, 0, 148, 30, 'F'); doc.setTextColor(34, 197, 94); doc.setFontSize(16);
                doc.text("TRVNX_OS PAYOUT INVOICE", 10, 15); doc.setTextColor(255, 255, 255); doc.setFontSize(8);
                doc.text(`Date: ${new Date().toLocaleDateString()}`, 10, 22); doc.setTextColor(0, 0, 0); doc.setFontSize(10);
                doc.text(`Distributor: ${user.name}`, 10, 45);
                doc.text(`A/C Number: ${releaseModal.accountNumber}`, 10, 52);
                doc.text(`TxID: ${releaseModal.txId}`, 10, 57);
                autoTable(doc, { startY: 70, head: [['Description', 'Amount']], body: [['SR Commission Payout', `BDT ${releaseModal.amount}`]], theme: 'grid', headStyles: { fillColor: [34, 197, 94] } });
                doc.save(`Payout_Invoice_${data.slip?.id || releaseModal.txId}.pdf`);

                setReleaseModal({ isOpen: false, reqId: null, srId: null, amount: 0, accountNumber: '', txId: '' });
                fetchMyNetwork();
                fetchExtendedData();
            } else {
                const err = await res.json();
                alert(`❌ RELEASE FAILED: ${err.message}`);
            }
        } catch (err) { alert("⚠️ SYSTEM OFFLINE."); }
    };

    const handleRejectPayment = async (requestId) => {
        if (!window.confirm("Are you sure you want to reject this payout? The requested amount will be refunded to the SR's wallet.")) return;

        try {
            const res = await fetch('http://localhost:5000/api/admin/reject-sr-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify({ requestId })
            });
            if (res.ok) {
                alert("✅ PAYOUT REJECTED: Funds returned to SR.");
                fetchExtendedData();
            } else {
                alert("❌ REJECT FAILED.");
            }
        } catch (err) { alert("⚠️ SYSTEM OFFLINE."); }
    };

    const handleCreateSR = async (e) => {
        e.preventDefault();
        const payload = {
            name: srFormData.name, phone: srFormData.phone1, password: srFormData.password, role: 'SR',
            father_name: srFormData.fatherName, mother_name: srFormData.motherName,
            address: { line1: srFormData.address1, line2: srFormData.address2, division: srFormData.division, district: srFormData.district },
            phone_alt: srFormData.phone2,
            market_area: { districts: [srFormData.targetDistrict], thanas: [srFormData.targetThana], market_name: srFormData.marketName },
            commissions: { per_user: Number(srFormData.commPerUser) || 0, per_license: Number(srFormData.commPerLicense) || 0, salary: Number(srFormData.salary) || 0 },
            parent_id: myIdStr, createdBy: myIdStr
        };
        try {
            const res = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("✅ SR CREATED SUCCESSFULLY.");
                setSrFormData({ name: '', password: '', fatherName: '', motherName: '', address1: '', address2: '', division: '', district: '', phone1: '', phone2: '', targetDistrict: '', targetThana: '', marketName: '', salary: '', commPerUser: '', commPerLicense: '' });
                fetchMyNetwork();
                setActiveTab('sr_details');
            } else alert("❌ SR CREATION FAILED.");
        } catch (error) { alert("⚠️ SYSTEM OFFLINE."); }
    };

    const toggleUserLock = async (userId, currentStatus) => {
        const res = await fetch(`http://localhost:5000/api/auth/toggle-status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
            body: JSON.stringify({ userId, status: currentStatus === 'ACTIVE' ? 'LOCKED' : 'ACTIVE' })
        });
        if (res.ok) fetchMyNetwork();
    };

    const handleCreateTarget = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...targetForm,
                target_name: targetForm.name,
                id_target: Number(targetForm.idTarget),
                license_target: Number(targetForm.licenseTarget),
                target_amount: 0,
                created_by: myIdStr,
                distributor_id: myIdStr,
                sr_id: targetForm.srId || null,
                target_level: 'SR'
            };
            const res = await fetch('http://localhost:5000/api/marketing/create-target', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("✅ SR MARKETING TARGET DEPLOYED.");
                setTargetForm({ name: '', startDate: '', endDate: '', srId: '', idTarget: '', licenseTarget: '', bonus: '' });
                fetchExtendedData();
                setActiveTab('marketing_targets');
            } else { alert("Failed to deploy target."); }
        } catch (err) { console.error(err); }
    };

    const allDivisions = Object.keys(BD_DATA);
    const currentDistricts = srFormData.division ? Object.keys(BD_DATA[srFormData.division]) : [];

    let availableTargetThanas = [];
    if (srFormData.targetDistrict) {
        Object.keys(BD_DATA).forEach(div => {
            if (BD_DATA[div][srFormData.targetDistrict]) {
                availableTargetThanas = BD_DATA[div][srFormData.targetDistrict];
            }
        });
        availableTargetThanas.sort();
    }

    const allDistrictsFlat = [];
    Object.keys(BD_DATA).forEach(div => {
        Object.keys(BD_DATA[div]).forEach(dist => {
            if (!allDistrictsFlat.includes(dist)) allDistrictsFlat.push(dist);
        });
    });
    allDistrictsFlat.sort();

    const applyDateFilter = (dataList, dateField = 'createdAt') => {
        return dataList.filter(item => {
            if (!dateFilter.start && !dateFilter.end) return true;
            const itemDate = new Date(item[dateField] || item.date).setHours(0,0,0,0);
            const start = dateFilter.start ? new Date(dateFilter.start).setHours(0,0,0,0) : null;
            const end = dateFilter.end ? new Date(dateFilter.end).setHours(23,59,59,999) : null;
            if (start && end) return itemDate >= start && itemDate <= end;
            if (start) return itemDate >= start;
            if (end) return itemDate <= end;
            return true;
        });
    };

    const generatePDF = (title, columns, rows) => {
        if (!rows || rows.length === 0) return alert("No data available to download.");
        const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
        doc.setFillColor(10, 17, 40); doc.rect(0, 0, 297, 30, 'F');
        doc.setTextColor(33, 150, 243); doc.setFontSize(16); doc.text(`TRVNX_OS - ${title.toUpperCase()}`, 15, 20);
        doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.text(`Distributor: ${user.name} | Date: ${new Date().toLocaleDateString()}`, 15, 26);
        autoTable(doc, { startY: 35, head: [columns], body: rows, theme: 'grid', headStyles: { fillColor: [33, 150, 243] }, styles: { fontSize: 7 } });
        doc.save(`TRVNX_${title.replace(/ /g, '_')}.pdf`);
    };

    const changePage = (key, val, max) => setCurrentPage(p => ({ ...p, [key]: Math.max(1, Math.min(val, max)) }));
    const clearDates = () => setDateFilter({start: '', end: ''});

    const paginate = (data, pageKey) => {
        const filtered = applyDateFilter(data);
        const max = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
        const sliced = filtered.slice((currentPage[pageKey] - 1) * ITEMS_PER_PAGE, currentPage[pageKey] * ITEMS_PER_PAGE);
        return { sliced, max, filtered };
    };

    const { sliced: srList, max: srMax, filtered: srAll } = paginate(mySRs, 'srDetails');
    const { sliced: srAcList, max: srAcMax, filtered: srAcAll } = paginate(srTransactions, 'srAc');
    const { sliced: incomeList, max: incomeMax, filtered: incomeAll } = paginate(financeLedger.filter(tx => tx.type === 'COMMISSION'), 'income');

    const calculatedBalance = incomeAll.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const today = new Date();
    const isEndOfMonth = today.getDate() === new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const canRequestPayout = calculatedBalance >= 10000 || isEndOfMonth;

    const handleRequestPayoutSubmit = async (e) => {
        e.preventDefault();
        const requestAmount = Number(payoutModal.amount);
        if (requestAmount > calculatedBalance || requestAmount <= 0) return alert("❌ INVALID AMOUNT.");

        try {
            const res = await fetch('http://localhost:5000/api/transactions/request-payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify({ amount: requestAmount })
            });
            if (res.ok) {
                alert(`✅ PAYOUT REQUESTED: ৳${requestAmount} has been deducted from your wallet.`);
                setPayoutModal({ isOpen: false, amount: 0 });
                fetchMyNetwork();
                fetchExtendedData();
            } else {
                alert("❌ Request denied.");
            }
        } catch (err) { alert("⚠️ SYSTEM_OFFLINE"); }
    };

    const { sliced: balanceList, max: balanceMax, filtered: balanceAll } = paginate(financeLedger, 'balance');
    const { sliced: shopList, max: shopMax, filtered: shopAll } = paginate(myShops, 'shop');

    const filteredMarketingTargets = marketingTargets.filter(t => {
        let match = true;
        if (targetSearchTerm) match = match && (t.sr_name?.toLowerCase().includes(targetSearchTerm.toLowerCase()) || t.target_name?.toLowerCase().includes(targetSearchTerm.toLowerCase()));
        if (targetFilterName) match = match && t.target_name?.toLowerCase().includes(targetFilterName.toLowerCase());
        if (targetFilterStart) match = match && new Date(t.start_date) >= new Date(targetFilterStart);
        if (targetFilterEnd) match = match && new Date(t.end_date) <= new Date(targetFilterEnd);
        return match;
    });

    // 🚀 FIXED: Strict Unit Calculator (Matches SR & Ignores Price)
    const calculatedMarketingTargets = filteredMarketingTargets.map(t => {
        let idCount = 0;
        let licCount = 0;

        if (myDevices && myDevices.length > 0) {
            const sDate = t.start_date ? new Date(t.start_date).setHours(0,0,0,0) : 0;
            const eDate = t.end_date ? new Date(t.end_date).setHours(23,59,59,999) : Infinity;

            myDevices.forEach(d => {
                const dDate = new Date(d.createdAt).getTime();
                if (dDate >= sDate && dDate <= eDate) {
                    const shopId = d.shopkeeper_id?._id || d.shopkeeper_id;
                    const shop = myShops.find(s => String(s._id) === String(shopId));
                    if(shop) {
                        // Match exactly to the SR if assigned, or count for global distributor target
                        if(t.sr_id) {
                            if(String(shop.parent_id) === String(t.sr_id)) {
                                idCount += 1;
                                licCount += 1;
                            }
                        } else {
                            idCount += 1;
                            licCount += 1;
                        }
                    }
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
    const totalAchievePct = totalTargetAmt > 0 ? ((totalSalesAmt / totalTargetAmt) * 100).toFixed(1) : 0;

    const graphData = calculatedMarketingTargets.length > 0 ? calculatedMarketingTargets.map((t, i) => ({
        name: `T${i+1}`,
        Target: Number(t.id_target || t.idTarget || 0),
        Achievement: Number(t.dynamic_id_achieved || 0)
    })) : [
        { name: 'No Data', Target: 0, Achievement: 0 }
    ];

    // 🚀 STRICT UNIT-BASED CALCULATION FOR HOME GRAPH
    const homeFilteredTargets = marketingTargets.filter(t => {
        if (!t.start_date) return true;
        const targetDate = new Date(t.start_date);
        const now = new Date();

        if (monthFilter !== 'ALL') {
            if (targetDate.getMonth() !== parseInt(monthFilter) || targetDate.getFullYear() !== now.getFullYear()) {
                return false;
            }
        }

        if (timeFilter === 'LAST_DAY') {
            return targetDate >= new Date(now.getTime() - (24 * 60 * 60 * 1000));
        } else if (timeFilter === 'LAST_7_DAYS') {
            return targetDate >= new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        } else if (timeFilter === 'LAST_15_DAYS') {
            return targetDate >= new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));
        }

        return true;
    });

    let homeTotalTargetAmt = 0;
    let homeTotalSalesAmt = 0;
    const groupedHome = {};

    homeFilteredTargets.forEach(t => {
        const dateStr = new Date(t.start_date || t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        if (!groupedHome[dateStr]) groupedHome[dateStr] = { name: dateStr, Target: 0, Achievement: 0 };

        // Force strict unit reading
        const targetAmt = Number(t.id_target || t.idTarget || 0);

        let achieveAmt = 0;
        const sDate = t.start_date ? new Date(t.start_date).setHours(0,0,0,0) : 0;
        const eDate = t.end_date ? new Date(t.end_date).setHours(23,59,59,999) : Infinity;

        if(myDevices && myDevices.length > 0) {
            myDevices.forEach(d => {
                const dDate = new Date(d.createdAt).getTime();
                if (dDate >= sDate && dDate <= eDate) {
                    const shopId = d.shopkeeper_id?._id || d.shopkeeper_id;
                    const shop = myShops.find(s => String(s._id) === String(shopId));
                    if(shop) {
                        if(t.sr_id) {
                            if(String(shop.parent_id) === String(t.sr_id)) achieveAmt += 1;
                        } else {
                            achieveAmt += 1;
                        }
                    }
                }
            });
        }

        groupedHome[dateStr].Target += targetAmt;
        groupedHome[dateStr].Achievement += achieveAmt;
        homeTotalTargetAmt += targetAmt;
        homeTotalSalesAmt += achieveAmt;
    });

    const dataArrHome = Object.values(groupedHome);
    const homeGraphData = dataArrHome.length > 0 ? dataArrHome : [{ name: 'No Data', Target: 0, Achievement: 0 }];
    const homeTotalAchievePct = homeTotalTargetAmt > 0 ? ((homeTotalSalesAmt / homeTotalTargetAmt) * 100).toFixed(1) : 0;

    const { sliced: deviceList, max: deviceMax, filtered: deviceAll } = paginate(myDevices, 'device');

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
        <div className="min-h-screen bg-[#050A15] text-white font-mono flex relative overflow-hidden uppercase font-bold">
            <aside
                className={`${isSidebarOpen ? 'w-64' : 'w-12 px-2'} shrink-0 transition-all duration-300 ease-in-out bg-[#0A1128] border-r border-[#273A60] flex flex-col z-20 whitespace-nowrap overflow-hidden`}
                onMouseEnter={() => setIsSidebarOpen(true)}
                onMouseLeave={() => setIsSidebarOpen(false)}
            >
                <div className="p-6 border-b border-[#273A60] flex justify-between items-center h-[85px] shrink-0 overflow-hidden">
                    <div className="flex items-center gap-3 w-full">
                        <div className="text-xl text-gray-500">≡</div>
                        {isSidebarOpen && (
                            <div>
                                <h2 className="text-lg font-black tracking-tighter text-blue-500 italic">TRVNX_OS</h2>
                                <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-1">DISTRIBUTOR_NODE</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="text-[8px] text-gray-500 font-bold mb-4 tracking-widest uppercase">Operations_Matrix</div>

                    <button onClick={() => setActiveTab('home')} className={`px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all flex items-center gap-4 ${activeTab === 'home' ? 'bg-[#0F172A] text-blue-400 border-l-4 border-blue-500' : 'text-gray-500 hover:bg-gray-800'}`}>
                        <span className="text-sm">🏠</span>
                        {isSidebarOpen && <span>HOME / DASHBOARD</span>}
                    </button>

                    <div className="flex flex-col">
                        <button onClick={() => setIsSrMenuOpen(!isSrMenuOpen)} className={`px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all flex justify-between items-center ${activeTab.startsWith('sr_') ? 'text-indigo-400' : 'text-gray-500 hover:bg-gray-800'}`}>
                            <div className="flex items-center gap-4">
                                <span className="text-sm">👥</span>
                                {isSidebarOpen && <span>SR MANAGEMENT</span>}
                            </div>
                            {isSidebarOpen && <span>{isSrMenuOpen ? '▼' : '▶'}</span>}
                        </button>
                        {isSrMenuOpen && isSidebarOpen && (
                            <div className="ml-4 pl-4 border-l border-indigo-900/40 flex flex-col gap-1 mt-1">
                                <button onClick={() => setActiveTab('sr_create')} className={`px-4 py-2 rounded text-left text-[9px] tracking-widest ${activeTab === 'sr_create' ? 'text-indigo-300 bg-indigo-500/10' : 'text-gray-600 hover:text-indigo-400'}`}>CREATE NEW</button>
                                <button onClick={() => setActiveTab('sr_details')} className={`px-4 py-2 rounded text-left text-[9px] tracking-widest ${activeTab === 'sr_details' ? 'text-indigo-300 bg-indigo-500/10' : 'text-gray-600 hover:text-indigo-400'}`}>SR DETAILS</button>
                                <button onClick={() => setActiveTab('sr_ac')} className={`px-4 py-2 rounded text-left text-[9px] tracking-widest ${activeTab === 'sr_ac' ? 'text-indigo-300 bg-indigo-500/10' : 'text-gray-600 hover:text-indigo-400'}`}>SR FULL A/C</button>
                                <button onClick={() => setActiveTab('sr_payout_request')} className={`px-4 py-2 rounded text-left text-[9px] tracking-widest ${activeTab === 'sr_payout_request' ? 'text-indigo-300 bg-indigo-500/10' : 'text-gray-600 hover:text-indigo-400'}`}>SR PAYOUT REQUESTS</button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <button onClick={() => setIsFinanceMenuOpen(!isFinanceMenuOpen)} className={`px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all flex justify-between items-center ${activeTab.startsWith('finance_') ? 'text-green-400' : 'text-gray-500 hover:bg-gray-800'}`}>
                            <div className="flex items-center gap-4">
                                <span className="text-sm">💳</span>
                                {isSidebarOpen && <span>FINANCE</span>}
                            </div>
                            {isSidebarOpen && <span>{isFinanceMenuOpen ? '▼' : '▶'}</span>}
                        </button>
                        {isFinanceMenuOpen && isSidebarOpen && (
                            <div className="ml-4 pl-4 border-l border-green-900/40 flex flex-col gap-1 mt-1">
                                <button onClick={() => setActiveTab('finance_income')} className={`px-4 py-2 rounded text-left text-[9px] tracking-widest ${activeTab === 'finance_income' ? 'text-green-300 bg-green-500/10' : 'text-gray-600 hover:text-green-400'}`}>INCOME</button>
                                <button onClick={() => setActiveTab('finance_balance')} className={`px-4 py-2 rounded text-left text-[9px] tracking-widest ${activeTab === 'finance_balance' ? 'text-green-300 bg-green-500/10' : 'text-gray-600 hover:text-green-400'}`}>BALANCE SHEET</button>
                                <button onClick={() => setActiveTab('dist_payout_request')} className={`px-4 py-2 rounded text-left text-[9px] tracking-widest ${activeTab === 'dist_payout_request' ? 'text-green-300 bg-green-500/10' : 'text-gray-600 hover:text-green-400'}`}>MY PAYOUT REQUESTS</button>
                            </div>
                        )}
                    </div>

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
                                <button onClick={() => setActiveTab('marketing_create')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'marketing_create' ? 'text-pink-300 bg-pink-500/10' : 'text-gray-600 hover:text-pink-400 transition-colors'}`}>CREATE TARGET</button>
                                <button onClick={() => setActiveTab('marketing_targets')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'marketing_targets' ? 'text-pink-300 bg-pink-500/10' : 'text-gray-600 hover:text-pink-400 transition-colors'}`}>TARGET & ACHIEVEMENT</button>
                            </div>
                        )}
                    </div>

                    <button onClick={() => setActiveTab('shop')} className={`px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all flex justify-between items-center ${activeTab === 'shop' ? 'bg-[#0F172A] text-blue-400 border-l-4 border-blue-500' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'}`}>
                        <div className="flex items-center gap-4">
                            <span className="text-sm">🛒</span>
                            {isSidebarOpen && <span>SHOP</span>}
                        </div>
                        {isSidebarOpen && pendingShopCount > 0 && <span className="bg-orange-500 text-white rounded-full px-2 py-0.5 text-[8px] animate-pulse">{pendingShopCount}</span>}
                    </button>
                    <button onClick={() => setActiveTab('device')} className={`px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all flex justify-between items-center ${activeTab === 'device' ? 'bg-[#0F172A] text-teal-400 border-l-4 border-teal-500' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'}`}>
                        <div className="flex items-center gap-4">
                            <span className="text-sm">📱</span>
                            {isSidebarOpen && <span>ALL DEVICES</span>}
                        </div>
                    </button>

                    <div className="mt-auto pt-8 pb-4 flex flex-col gap-2">
                        <button onClick={() => setShowPasswordModal(true)} className="w-full bg-transparent text-gray-500 hover:text-white border border-transparent px-4 py-3 rounded text-[10px] font-bold text-left hover:bg-gray-800 transition-all uppercase tracking-widest flex items-center gap-4">
                            <span className="text-sm">🔒</span>
                            {isSidebarOpen && <span>CHANGE PASSWORD</span>}
                        </button>
                        <button onClick={onLogout} className="w-full bg-red-900/20 text-red-500 border border-red-900/50 px-4 py-3 rounded text-[10px] font-black text-left hover:bg-red-900/40 hover:text-white transition-all uppercase tracking-widest flex items-center gap-4">
                            <span className="text-sm">⏻</span>
                            {isSidebarOpen && <span>LOGOUT</span>}
                        </button>
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="flex justify-between items-center p-4 md:px-8 border-b border-[#273A60] bg-[#050A15] shrink-0 h-[85px]">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-3xl text-gray-500 hover:text-white transition-colors mb-1">≡</button>
                        <div>
                            <h1 className="text-xl font-black text-blue-500 italic tracking-tighter">TRVNX_DISTRIBUTOR_HUB</h1>
                            <p className="text-[9px] text-gray-500 tracking-widest mt-1">Identity: {user.name} | Wallet: ৳{calculatedBalance.toLocaleString()}</p>
                        </div>
                    </div>
                    {calculatedBalance >= 10000 && (
                        <button onClick={() => setPayoutModal({isOpen: true, amount: calculatedBalance})} className="bg-green-600 hover:bg-green-500 text-white px-4 md:px-6 py-2 rounded text-[9px] md:text-[10px] shadow-lg shadow-green-900/30 tracking-widest animate-pulse">
                            + REQUEST PAYOUT
                        </button>
                    )}
                </header>

                <div className="flex-1 min-h-screen overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    {!['home', 'sr_create', 'marketing_create', 'marketing_targets'].includes(activeTab) && (
                        <div className="flex justify-between items-center bg-[#0A1128] p-3 rounded border border-[#273A60] mb-4">
                            <div className="flex items-center gap-4 text-[9px] text-gray-500">
                                <label>FROM: <input type="date" className="bg-[#050A15] border border-[#273A60] p-1 text-blue-300 ml-1 outline-none" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} /></label>
                                <label>TO: <input type="date" className="bg-[#050A15] border border-[#273A60] p-1 text-blue-300 ml-1 outline-none" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} /></label>
                                <button onClick={clearDates} className="bg-gray-800 hover:text-white px-2 py-1 rounded">CLEAR</button>
                            </div>
                        </div>
                    )}

                    {/* 🚀 NEW: HOME TAB WITH GRAPH AND FILTERS */}
                    {activeTab === 'home' && (
                        <div className="space-y-6">
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

                            {/* 🚀 NEW: TIME & MONTH FILTERS */}
                            <div className="bg-[#0A1128] border border-[#273A60] p-4 rounded shadow-lg">
                                <div className="flex flex-wrap gap-2 justify-center mb-4 border-b border-[#273A60] pb-4">
                                    <FilterButton label="LAST DAY" active={timeFilter === 'LAST_DAY' && monthFilter === 'ALL'} onClick={() => {setTimeFilter('LAST_DAY'); setMonthFilter('ALL');}} />
                                    <FilterButton label="LAST 7 DAYS" active={timeFilter === 'LAST_7_DAYS' && monthFilter === 'ALL'} onClick={() => {setTimeFilter('LAST_7_DAYS'); setMonthFilter('ALL');}} />
                                    <FilterButton label="LAST 15 DAYS" active={timeFilter === 'LAST_15_DAYS' && monthFilter === 'ALL'} onClick={() => {setTimeFilter('LAST_15_DAYS'); setMonthFilter('ALL');}} />
                                </div>

                                <div className="flex flex-wrap gap-2 justify-center">
                                    {MONTHS.map((month, index) => (
                                        <FilterButton key={month} label={month} active={monthFilter === String(index)} onClick={() => {setMonthFilter(String(index)); setTimeFilter('ALL');}} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'sr_create' && (
                        <div className="max-w-4xl mx-auto">
                            <form onSubmit={handleCreateSR} className="bg-[#111A35] p-8 border border-indigo-900/30 rounded shadow-2xl space-y-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                <h3 className="text-indigo-400 text-xs tracking-[0.2em] border-b border-[#273A60] pb-4 italic">Initialize SR Node Profile</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1"><label className="text-[9px] text-gray-500">Name</label><input required type="text" className="w-full bg-black border border-[#273A60] p-2 text-xs text-white" value={srFormData.name} onChange={e => setSrFormData({...srFormData, name: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-[9px] text-gray-500">Assign Password</label><input required type="text" className="w-full bg-black border border-[#273A60] p-2 text-xs text-white" value={srFormData.password} onChange={e => setSrFormData({...srFormData, password: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-[9px] text-gray-500">Father's Name</label><input required type="text" className="w-full bg-black border border-[#273A60] p-2 text-xs text-white" value={srFormData.fatherName} onChange={e => setSrFormData({...srFormData, fatherName: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-[9px] text-gray-500">Mother's Name</label><input required type="text" className="w-full bg-black border border-[#273A60] p-2 text-xs text-white" value={srFormData.motherName} onChange={e => setSrFormData({...srFormData, motherName: e.target.value})} /></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#273A60]">
                                    <input required type="text" placeholder="Address Line 1" className="w-full bg-black border border-[#273A60] p-2 text-xs text-white" value={srFormData.address1} onChange={e => setSrFormData({...srFormData, address1: e.target.value})} />
                                    <input type="text" placeholder="Address Line 2" className="w-full bg-black border border-[#273A60] p-2 text-xs text-white" value={srFormData.address2} onChange={e => setSrFormData({...srFormData, address2: e.target.value})} />
                                    <select required className="bg-black border border-[#273A60] p-2 text-xs text-indigo-300" value={srFormData.division} onChange={e => setSrFormData({...srFormData, division: e.target.value, district: ''})}>
                                        <option value="">Division</option>{allDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <select required className="bg-black border border-[#273A60] p-2 text-xs text-indigo-300" disabled={!srFormData.division} value={srFormData.district} onChange={e => setSrFormData({...srFormData, district: e.target.value})}>
                                        <option value="">District</option>{currentDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#273A60]">
                                    <div className="space-y-1"><label className="text-[9px] text-gray-500">Phone 1</label><input required type="text" className="w-full bg-black border border-[#273A60] p-2 text-xs text-white" value={srFormData.phone1} onChange={e => setSrFormData({...srFormData, phone1: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-[9px] text-gray-500">Phone 2 (Optional)</label><input type="text" className="w-full bg-black border border-[#273A60] p-2 text-xs text-white" value={srFormData.phone2} onChange={e => setSrFormData({...srFormData, phone2: e.target.value})} /></div>
                                </div>

                                <div className="pt-4 border-t border-[#273A60] space-y-4">
                                    <p className="text-[9px] text-indigo-500 tracking-widest">Target Market Operating Territory</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <select required className="bg-black border border-[#273A60] p-2 text-xs text-indigo-300"
                                                value={srFormData.targetDistrict}
                                                onChange={e => setSrFormData({...srFormData, targetDistrict: e.target.value, targetThana: ''})}>
                                            <option value="">Assign District</option>
                                            {allDistrictsFlat.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <select required className="bg-black border border-[#273A60] p-2 text-xs text-indigo-300"
                                                disabled={!srFormData.targetDistrict}
                                                value={srFormData.targetThana}
                                                onChange={e => setSrFormData({...srFormData, targetThana: e.target.value})}>
                                            <option value="">Assign Thana</option>
                                            {availableTargetThanas.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <input required type="text" placeholder="Specific Market Name" className="w-full bg-black border border-[#273A60] p-2 text-xs text-indigo-300" value={srFormData.marketName} onChange={e => setSrFormData({...srFormData, marketName: e.target.value})} />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-[#273A60] space-y-4">
                                    <p className="text-[9px] text-indigo-500 tracking-widest">Commission Matrix</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1"><label className="text-[8px] text-gray-500">Salary (Optional)</label><input type="number" className="w-full bg-black border border-[#273A60] p-2 text-xs text-green-400" value={srFormData.salary} onChange={e => setSrFormData({...srFormData, salary: e.target.value})} /></div>
                                        <div className="space-y-1"><label className="text-[8px] text-gray-500">Comm per ID (Optional)</label><input type="number" className="w-full bg-black border border-[#273A60] p-2 text-xs text-indigo-400" value={srFormData.commPerUser} onChange={e => setSrFormData({...srFormData, commPerUser: e.target.value})} /></div>
                                        <div className="space-y-1"><label className="text-[8px] text-gray-500">Comm per License (Optional)</label><input type="number" className="w-full bg-black border border-[#273A60] p-2 text-xs text-indigo-400" value={srFormData.commPerLicense} onChange={e => setSrFormData({...srFormData, commPerLicense: e.target.value})} /></div>
                                    </div>
                                    <p className="text-[8px] text-gray-600 italic">Note: SR Salary + Commissions generated will act as your liability and deduct from your balance.</p>
                                </div>

                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded text-[10px] tracking-[0.4em] shadow-xl shadow-indigo-900/40">INITIALIZE_SR_NODE</button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'sr_details' && (
                        <div className="bg-[#111A35] border border-[#273A60] rounded shadow-2xl">
                            <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                <h3 className="text-xs text-indigo-300 tracking-widest">SR Details</h3>
                                <div className="flex gap-4 items-center">
                                    <button onClick={() => generatePDF('SR Details', ['ID', 'Name', 'Parent', 'Contact', 'Comm A', 'Comm B', 'Salary'], srAll.map(s=>[s._id.slice(-6), s.name, `F:${s.father_name}`, s.phone, s.commissions?.per_user||0, s.commissions?.per_license||0, s.commissions?.salary||0]))} className="text-[9px] bg-blue-600 px-3 py-1 rounded">📄 PDF</button>
                                    <div className="text-[9px] text-gray-500">
                                        <button onClick={() => changePage('srDetails', currentPage.srDetails - 1, srMax)}>◀</button> PAGE {currentPage.srDetails}/{srMax} <button onClick={() => changePage('srDetails', currentPage.srDetails + 1, srMax)}>▶</button>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[9px] whitespace-nowrap">
                                    <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                                    <tr><th className="p-4">No</th><th className="p-4">ID No</th><th className="p-4">Name</th><th className="p-4">Parent</th><th className="p-4">Contact</th><th className="p-4">Comm A/B & Salary</th><th className="p-4 text-right">Security Command</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#162447]">
                                    {srList.map((sr, idx) => (
                                        <tr key={sr._id} className="hover:bg-indigo-900/5 transition-colors">
                                            <td className="p-4 text-gray-600">{((currentPage.srDetails - 1) * ITEMS_PER_PAGE) + idx + 1}</td>
                                            <td className="p-4 text-blue-400">{sr._id.slice(-6).toUpperCase()}</td>
                                            <td className="p-4 text-white">{sr.name}</td>
                                            <td className="p-4 text-gray-500">F: {sr.father_name}<br/>M: {sr.mother_name}</td>
                                            <td className="p-4 text-gray-300">{sr.phone}</td>
                                            <td className="p-4">
                                                <span className="text-green-500">A: ৳{sr.commissions?.per_user || 0}</span><br/>
                                                <span className="text-blue-500">B: ৳{sr.commissions?.per_license || 0}</span><br/>
                                                <span className="text-yellow-500">S: ৳{sr.commissions?.salary || 0}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => toggleUserLock(sr._id, sr.status)} className={`px-3 py-1 rounded text-[8px] ${sr.status === 'LOCKED' ? 'bg-green-600' : 'bg-red-900/40 border-red-500 text-red-500'}`}>{sr.status === 'LOCKED' ? 'UNLOCK' : 'LOCK'}</button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'sr_payout_request' && (
                        <div className="space-y-6">
                            <div className="bg-[#111A35] border border-orange-500/50 rounded shadow-2xl overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                                <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                    <h3 className="text-xs text-orange-400 tracking-widest animate-pulse">SR PAYOUT REQUESTS</h3>
                                    <button onClick={fetchExtendedData} className="text-[9px] bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full border border-orange-500/30 hover:bg-orange-500/40 transition-all font-black">↻ SYNC</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[9px] whitespace-nowrap">
                                        <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                                        <tr><th className="p-4">Date</th><th className="p-4">SR Name</th><th className="p-4 text-right">Requested Amount</th><th className="p-4 text-right">Payout Status</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#162447]">
                                        {srPayoutRequests.map((req, idx) => (
                                            <tr key={req._id} className="hover:bg-orange-900/5 transition-colors">
                                                <td className="p-4 text-gray-400">{new Date(req.createdAt).toLocaleDateString()}</td>
                                                <td className="p-4 text-white">
                                                    {req.userId?.name}
                                                    <div className="text-[7px] text-gray-500 mt-1 font-mono">{String(req.userId?._id || req.userId).slice(-6).toUpperCase()}</div>
                                                </td>
                                                <td className="p-4 text-green-400 font-mono text-right font-black text-sm">৳{req.amount}</td>
                                                <td className="p-4 text-right">
                                                    {req.status === 'PENDING' ? (
                                                        <div className="flex gap-2 justify-end">
                                                            <button onClick={() => setReleaseModal({ isOpen: true, reqId: req._id, srId: req.userId?._id, amount: req.amount, accountNumber: '', txId: '' })} className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded text-[8px] tracking-widest font-black shadow-lg">RELEASE</button>
                                                            <button onClick={() => handleRejectPayment(req._id)} className="bg-red-900/40 hover:bg-red-600 border border-red-500 text-red-500 hover:text-white px-3 py-1.5 rounded text-[8px] tracking-widest font-black shadow-lg">REJECT</button>
                                                        </div>
                                                    ) : (
                                                        <span className={`font-black tracking-widest ${req.status === 'REJECTED' ? 'text-red-500' : 'text-green-500'}`}>{req.status}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {srPayoutRequests.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-600 italic tracking-widest">No pending payout requests from SRs.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {(activeTab === 'sr_ac' || activeTab === 'finance_sr_ac') && (
                        <div className="space-y-6">
                            <div className="bg-[#111A35] border border-[#273A60] rounded shadow-2xl">
                                <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                    <h3 className="text-xs text-indigo-300 tracking-widest font-black uppercase">SR Full Ledger (Income & Deductions)</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[9px] whitespace-nowrap uppercase font-bold">
                                        <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                                        <tr>
                                            <th className="p-4">No</th>
                                            <th className="p-4">Date</th>
                                            <th className="p-4">SR Name</th>
                                            <th className="p-4">Type</th>
                                            <th className="p-4">Description</th>
                                            <th className="p-4 text-right">Amount</th>
                                            <th className="p-4 text-right">Status</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#162447]">
                                        {srAcList.map((tx, idx) => {
                                            const srUser = mySRs.find(u => String(u._id) === String(tx.userId?._id || tx.userId));
                                            return (
                                                <tr key={tx._id} className="hover:bg-indigo-900/5 transition-colors">
                                                    <td className="p-4 text-gray-600">{((currentPage.srAc - 1) * ITEMS_PER_PAGE) + idx + 1}</td>
                                                    <td className="p-4 text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                                    <td className="p-4 text-white">
                                                        {srUser?.name || tx.userId?.name || 'N/A'}
                                                        <div className="text-[7px] text-gray-500 mt-1 font-mono">{String(tx.userId?._id || tx.userId).slice(-6).toUpperCase()}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 rounded text-[8px] border ${(tx.type === 'SR_COMMISSION' || tx.type === 'COMMISSION') ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                                            {tx.type}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-gray-400 italic">{tx.remarks || tx.description || tx.type}</td>
                                                    <td className="p-4 text-right font-mono font-black text-white">৳{tx.amount}</td>
                                                    <td className="p-4 text-right font-black text-[9px] tracking-widest">
                                                        {tx.status === 'SUCCESS' ? <span className="text-green-500">SUCCESS</span> :
                                                            tx.status === 'REJECTED' ? <span className="text-red-500">REJECTED</span> :
                                                                <span className="text-yellow-500">{tx.status}</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {srAcList.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-gray-600 italic tracking-widest">No transactions found for your SRs.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'dist_payout_request' && (
                        <div className="space-y-6">
                            <div className="bg-[#111A35] border border-green-500/50 rounded shadow-2xl overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                                <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                    <h3 className="text-xs text-green-400 tracking-widest font-black uppercase">Distributor Payout Request</h3>
                                </div>
                                <div className="p-8 max-w-sm">
                                    <div className="mb-6">
                                        <p className="text-[9px] text-gray-500 font-black tracking-widest uppercase mb-1">Available Commission Balance</p>
                                        <h2 className="text-3xl font-black text-green-400 font-mono">৳{calculatedBalance.toLocaleString()}</h2>
                                        {!canRequestPayout && <p className="text-[8px] text-red-400 mt-2 font-black tracking-widest">Payout locked. Minimum ৳10,000 or End of Month required.</p>}
                                    </div>
                                    <button onClick={() => setPayoutModal({isOpen: true, amount: calculatedBalance})} disabled={!canRequestPayout} className={`w-full py-4 rounded text-[10px] font-black tracking-widest shadow-lg transition-all ${canRequestPayout ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/30' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
                                        REQUEST PAYOUT TO ADMIN
                                    </button>
                                </div>
                            </div>

                            <div className="bg-[#111A35] border border-[#273A60] rounded shadow-2xl">
                                <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                    <h3 className="text-xs text-gray-300 tracking-widest">Payout Request History</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[9px] whitespace-nowrap">
                                        <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                                        <tr><th className="p-4">Date</th><th className="p-4">Description</th><th className="p-4 text-right">Requested Amount</th><th className="p-4 text-right">Status</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#162447]">
                                        {financeLedger.filter(tx => tx.type === 'PAYOUT_REQUEST').map((tx, idx) => (
                                            <tr key={tx._id} className="hover:bg-gray-900/50 transition-colors">
                                                <td className="p-4 text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                                <td className="p-4 text-gray-300 italic">{tx.remarks || 'Payout Request'}</td>
                                                <td className="p-4 text-right text-white font-mono font-black">৳{tx.amount}</td>
                                                <td className="p-4 text-right font-black">
                                                    {tx.status === 'SUCCESS' || tx.status === 'RELEASED' ? <span className="text-green-500">RELEASED</span> :
                                                        tx.status === 'REJECTED' ? <span className="text-red-500">REJECTED</span> :
                                                            <span className="text-yellow-500">{tx.status}</span>}
                                                </td>
                                            </tr>
                                        ))}
                                        {financeLedger.filter(tx => tx.type === 'PAYOUT_REQUEST').length === 0 && (
                                            <tr><td colSpan="4" className="p-8 text-center text-gray-600 italic tracking-widest">No previous payout requests.</td></tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'finance_income' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-[#0A1128] p-4 rounded border border-[#273A60] shadow-lg">
                                <div>
                                    <p className="text-[8px] text-gray-500 font-black tracking-widest uppercase">Total Available Income</p>
                                    <h2 className="text-2xl font-black text-green-400 font-mono">৳{calculatedBalance.toLocaleString()}</h2>
                                    {!canRequestPayout && <p className="text-[8px] text-red-400 mt-1 font-black tracking-widest">Payout locked. Min ৳10000 or End of Month.</p>}
                                </div>
                                <button onClick={() => setPayoutModal({isOpen: true, amount: calculatedBalance})} disabled={!canRequestPayout} className={`px-6 py-3 rounded text-[10px] font-black tracking-widest shadow-lg transition-all ${canRequestPayout ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/30 animate-pulse' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
                                    REQUEST PAYOUT
                                </button>
                            </div>

                            <div className="bg-[#111A35] border border-[#273A60] rounded shadow-2xl">
                                <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                    <h3 className="text-xs text-green-400 tracking-widest">My Income Ledger</h3>
                                    <div className="flex gap-4 items-center">
                                        <button onClick={() => generatePDF('Income', ['Date', 'Type', 'Shop Name', 'Desc', 'Amount'], incomeAll.map(tx=>[new Date(tx.createdAt).toLocaleDateString(), tx.type, tx.related_shop?.name||'N/A', tx.remarks||'-', tx.amount]))} className="text-[9px] bg-blue-600 px-3 py-1 rounded">📄 PDF</button>
                                        <div className="text-[9px] text-gray-500">
                                            <button onClick={() => changePage('income', currentPage.income - 1, incomeMax)}>◀</button> PAGE {currentPage.income}/{incomeMax} <button onClick={() => changePage('income', currentPage.income + 1, incomeMax)}>▶</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[9px] whitespace-nowrap">
                                        <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                                        <tr><th className="p-4">Date</th><th className="p-4">Type</th><th className="p-4">Shop Name</th><th className="p-4">Description</th><th className="p-4">Amount</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#162447]">
                                        {incomeList.map(tx => (
                                            <tr key={tx._id} className="hover:bg-green-900/5 transition-colors">
                                                <td className="p-4 text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                                <td className="p-4 text-green-400">{tx.type}</td>
                                                <td className="p-4 text-white">{tx.related_shop?.business_name || 'N/A'}</td>
                                                <td className="p-4 text-gray-500">{tx.remarks || tx.description}</td>
                                                <td className="p-4 text-green-400 font-mono">৳{tx.amount}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'finance_balance' && (
                        <div className="bg-[#111A35] border border-[#273A60] rounded shadow-2xl">
                            <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                <h3 className="text-xs text-green-400 tracking-widest">Distributor Balance Sheet</h3>
                                <div className="flex gap-4 items-center">
                                    <button onClick={() => generatePDF('Balance Sheet', ['Date', 'Type', 'Desc', 'Amount'], balanceAll.map(tx=>[new Date(tx.createdAt).toLocaleDateString(), tx.type, tx.remarks||'-', tx.amount]))} className="text-[9px] bg-blue-600 px-3 py-1 rounded">📄 PDF</button>
                                    <div className="text-[9px] text-gray-500">
                                        <button onClick={() => changePage('balance', currentPage.balance - 1, balanceMax)}>◀</button> PAGE {currentPage.balance}/{balanceMax} <button onClick={() => changePage('balance', currentPage.balance + 1, balanceMax)}>▶</button>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[9px] whitespace-nowrap">
                                    <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                                    <tr><th className="p-4">Date</th><th className="p-4">Type</th><th className="p-4">Description</th><th className="p-4 text-right">Amount (IN)</th><th className="p-4 text-right">Amount (OUT)</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#162447]">
                                    {balanceList.map(tx => {
                                        const isIncome = ['COMMISSION'].includes(tx.type);
                                        return (
                                            <tr key={tx._id} className="hover:bg-[#162447] transition-colors">
                                                <td className="p-4 text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                                <td className="p-4 text-gray-300">{tx.type}</td>
                                                <td className="p-4 text-gray-500">{tx.remarks || tx.description}</td>
                                                <td className="p-4 text-right text-green-400 font-mono">{isIncome ? `৳${tx.amount}` : '-'}</td>
                                                <td className="p-4 text-right text-red-400 font-mono">{!isIncome ? `৳${tx.amount}` : '-'}</td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 🚀 TARGET CREATION (AUTO-NAMING & SR SELECTION) */}
                    {activeTab === 'marketing_create' && (
                        <div className="max-w-4xl mx-auto">
                            <form onSubmit={handleCreateTarget} className="bg-[#111A35] p-8 border border-pink-900/30 rounded shadow-2xl space-y-8 relative overflow-hidden uppercase font-bold">
                                <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
                                <h3 className="text-pink-400 font-black text-xs uppercase tracking-[0.2em] border-b border-[#273A60] pb-4 italic tracking-widest">Initialize SR Marketing Target</h3>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-gray-500 uppercase tracking-widest">Target Plan Name (Auto-Generated)</label>
                                        <input
                                            required
                                            type="text"
                                            readOnly
                                            className="w-full bg-[#050A15] border border-green-500/30 p-3 text-xs text-green-400 outline-none font-black tracking-widest cursor-not-allowed"
                                            value={targetForm.name}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-gray-500 uppercase tracking-widest">Target Month</label>
                                            <select
                                                value={targetMonth}
                                                onChange={e => setTargetMonth(Number(e.target.value))}
                                                className="w-full bg-[#050A15] border border-[#273A60] p-3 text-xs text-pink-300 outline-none font-bold uppercase cursor-pointer"
                                            >
                                                {MONTHS.map((m, idx) => (
                                                    <option key={m} value={idx}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-gray-500 uppercase tracking-widest">Target Year</label>
                                            <select
                                                value={targetYear}
                                                onChange={e => setTargetYear(Number(e.target.value))}
                                                className="w-full bg-[#050A15] border border-[#273A60] p-3 text-xs text-pink-300 outline-none font-bold uppercase cursor-pointer"
                                            >
                                                {YEARS.map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#273A60]">
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-gray-500 uppercase tracking-widest">ID Generate Target</label>
                                            <input required type="number" placeholder="Count" className="w-full bg-[#050A15] border border-[#273A60] p-3 text-xs text-white" value={targetForm.idTarget} onChange={e => setTargetForm({...targetForm, idTarget: e.target.value, id_target: e.target.value, target_amount: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-gray-500 uppercase tracking-widest">License Key Target</label>
                                            <input required type="number" placeholder="Count" className="w-full bg-[#050A15] border border-[#273A60] p-3 text-xs text-white" value={targetForm.licenseTarget} onChange={e => setTargetForm({...targetForm, licenseTarget: e.target.value, license_target: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-gray-500 uppercase tracking-widest">Target Bonus (Optional)</label>
                                            <input type="number" placeholder="৳ Amount" className="w-full bg-[#050A15] border border-[#273A60] p-3 text-xs text-green-400 font-black" value={targetForm.bonus} onChange={e => setTargetForm({...targetForm, bonus: e.target.value, bonus_amount: e.target.value})} />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-[#273A60]">
                                        <div className="space-y-1 relative">
                                            <label className="text-[9px] text-gray-500 uppercase tracking-widest">Assign SR (Optional)</label>
                                            <div onClick={() => setIsSrDropdownOpen(!isSrDropdownOpen)} className={`w-full bg-[#050A15] border border-[#273A60] p-3 text-white cursor-pointer rounded flex items-center justify-between text-xs`}>
                                                {targetForm.srId ? mySRs.find(s => String(s._id) === String(targetForm.srId))?.name : "GLOBAL / ALL SRs"}
                                                <span className="text-blue-500">{isSrDropdownOpen ? '▲' : '▼'}</span>
                                            </div>
                                            {isSrDropdownOpen && (
                                                <div className="absolute w-full bg-[#0A1128] border border-blue-500/30 max-h-48 overflow-y-auto z-10 shadow-2xl rounded mt-1 text-xs">
                                                    <div onClick={() => { setTargetForm({...targetForm, srId: ''}); setIsSrDropdownOpen(false); }} className="p-3 border-b border-[#273A60] hover:bg-blue-600 cursor-pointer">GLOBAL / ALL SRs</div>
                                                    {mySRs.map(s => (
                                                        <div key={s._id} onClick={() => { setTargetForm({...targetForm, srId: s._id}); setIsSrDropdownOpen(false); }} className="p-3 hover:bg-blue-900 cursor-pointer border-b border-[#050A15]">{s.name}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded text-[9px] text-blue-300 font-mono italic">
                                        Date Range is automatically set from the 1st to the last day of the selected month/year. Target Name is auto-formatted.
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 py-4 rounded text-[11px] font-black tracking-[0.4em] transition-all shadow-xl shadow-pink-900/40 uppercase">DEPLOY TARGET PLAN</button>
                            </form>
                        </div>
                    )}

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
                                        <input type="text" placeholder="Search Target Name..." value={targetSearchTerm} onChange={(e) => setTargetSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-600 font-bold uppercase w-full md:w-48" />
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
                                    <span>PAGE {currentTargetPage} OF {Math.ceil(calculatedMarketingTargets.length / TARGETS_PER_PAGE) || 1}</span>
                                    <button onClick={() => setCurrentTargetPage(prev => Math.min(prev + 1, Math.ceil(calculatedMarketingTargets.length / TARGETS_PER_PAGE) || 1))} className="hover:text-white transition-colors">NEXT ▶</button>
                                </div>
                            </div>

                            {/* 🚀 ACHIEVEMENT MATRIX TABLE (Now shows ID %, License % like Admin) */}
                            <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl uppercase">
                                <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-pink-300">Target & Achievement Matrix</h3>
                                    <button onClick={() => fetchExtendedData()} className="text-[9px] bg-pink-500/20 text-pink-400 px-3 py-1 rounded-full border border-pink-500/30 hover:bg-pink-500/40 transition-all font-black uppercase tracking-widest">↻ SYNC_DATA</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase">
                                        <thead className="bg-[#050A15] text-gray-500 tracking-widest font-bold">
                                        <tr>
                                            <th className="p-4">Target Name</th>
                                            <th className="p-4 text-center text-blue-400">ID Target</th>
                                            <th className="p-4 text-center text-blue-400">ID Achieved</th>
                                            <th className="p-4 text-center text-blue-400 border-r border-[#273A60]/30">ID %</th>
                                            <th className="p-4 text-center text-teal-400">License Target</th>
                                            <th className="p-4 text-center text-teal-400">License Achieved</th>
                                            <th className="p-4 text-center text-teal-400 border-r border-[#273A60]/30">License %</th>
                                            <th className="p-4 text-center text-green-400">TOTAL %</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#162447]">
                                        {paginatedMarketingTargets.map((t) => {
                                            const idTarget = Number(t.id_target || t.idTarget || 0);
                                            const idAchieved = Number(t.dynamic_id_achieved || 0);
                                            const idPct = idTarget > 0 ? ((idAchieved / idTarget) * 100).toFixed(1) : 0;

                                            const licTarget = Number(t.license_target ?? t.licenseTarget ?? 0);
                                            const licAchieved = Number(t.dynamic_license_achieved || 0);
                                            const licPct = licTarget > 0 ? ((licAchieved / licTarget) * 100).toFixed(1) : 0;

                                            const totalPct = ((Number(idPct) + Number(licPct)) / 2).toFixed(1);

                                            return (
                                                <tr key={t._id || Math.random()} className="hover:bg-pink-900/5 transition-colors font-bold">
                                                    <td className="p-4 text-white">
                                                        {t.target_name || t.name}
                                                        <div className="text-[7px] text-gray-500 mt-1">
                                                            {new Date(t.start_date).toLocaleDateString('en-GB')} - {new Date(t.end_date).toLocaleDateString('en-GB')}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-blue-400 text-center font-mono">{idTarget.toLocaleString()}</td>
                                                    <td className="p-4 text-blue-200 text-center font-mono">{idAchieved.toLocaleString()}</td>
                                                    <td className={`p-4 text-center font-black border-r border-[#273A60]/30 ${idPct >= 100 ? 'text-green-500' : 'text-blue-500'}`}>{idPct}%</td>

                                                    <td className="p-4 text-teal-400 text-center font-mono">{licTarget.toLocaleString()}</td>
                                                    <td className="p-4 text-teal-200 text-center font-mono">{licAchieved.toLocaleString()}</td>
                                                    <td className={`p-4 text-center font-black border-r border-[#273A60]/30 ${licPct >= 100 ? 'text-green-500' : 'text-teal-500'}`}>{licPct}%</td>

                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-1 rounded ${totalPct >= 100 ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>{totalPct}%</span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        {paginatedMarketingTargets.length === 0 && (
                                            <tr><td colSpan="8" className="p-8 text-center text-gray-600 text-xs italic tracking-widest">No marketing targets found for this period.</td></tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: SHOP DIRECTORY */}
                    {activeTab === 'shop' && (
                        <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl">
                            <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                <h3 className="text-xs font-bold tracking-widest text-blue-400">My Managed Shops</h3>
                                <button onClick={() => generatePDF('My_Shops', ['Shop Name', 'Owner', 'Phone', 'Approval Status'], shopAll.map(s => [s.business_name, s.name, s.phone, s.approval?.status || 'APPROVED']))} className="text-[9px] bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-all">📄 PDF</button>
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
                                        <th className="p-4 text-center">View</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#162447]">
                                    {shopList.map((shop) => {
                                        let statusColor = "text-green-500";
                                        let statusText = shop.approval?.status || "APPROVED";
                                        let isClickable = false;

                                        if (statusText === 'WAITING_DISTRIBUTOR') {
                                            const hoursPassed = Math.abs(new Date() - new Date(shop.approval?.requested_at || shop.createdAt)) / 36e5;
                                            isClickable = true;
                                            if (hoursPassed > 48) { statusColor = "text-red-500"; statusText = "ESCALATED TO ADMIN"; }
                                            else if (hoursPassed > 24) { statusColor = "text-yellow-500"; statusText = "WAITING > 24H"; }
                                            else { statusColor = "text-orange-500"; statusText = "WAITING DISTRIBUTOR"; }
                                        } else if (statusText === 'WAITING_ADMIN') {
                                            statusColor = "text-red-500";
                                        } else if (statusText === 'REJECTED') {
                                            statusColor = "text-red-600";
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
                                                    {isClickable ? (
                                                        <button onClick={() => setShopApproveModal({isOpen: true, shop})} className={`px-2 py-1 rounded text-[8px] font-black border bg-[#111A35] hover:bg-gray-800 ${statusColor.replace('text', 'border').replace('500', '500/30')} ${statusColor} animate-pulse shadow-lg cursor-pointer`}>
                                                            {statusText} (CLICK TO ACTION)
                                                        </button>
                                                    ) : (
                                                        <span className={`px-2 py-1 rounded text-[8px] font-black border ${statusColor.replace('text', 'bg').replace('500', '900/20')} ${statusColor.replace('text', 'border').replace('500', '500/30')} ${statusColor}`}>
                                                            {statusText}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button onClick={() => setViewShopModal({isOpen: true, shop: shop})} className="bg-transparent border border-[#273A60] text-gray-300 px-3 py-1 rounded text-[8px] hover:bg-gray-800 transition-all font-black">
                                                        VIEW PROFILE
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {shopList.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-600 italic">No shops deployed in your territory.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 bg-[#050A15] border-t border-[#273A60] flex justify-between items-center text-[9px] text-gray-500 font-black">
                                <button onClick={() => changePage('shop', currentPage.shop - 1, shopMax)} className="hover:text-white">◀ PREV</button>
                                <span>PAGE {currentPage.shop} OF {shopMax}</span>
                                <button onClick={() => changePage('shop', currentPage.shop + 1, shopMax)} className="hover:text-white">NEXT ▶</button>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: DEVICE DIRECTORY */}
                    {activeTab === 'device' && (
                        <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl">
                            <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                <h3 className="text-xs font-bold tracking-widest text-teal-400 uppercase">All Network Devices</h3>
                                <button onClick={() => generatePDF('Network_Devices', ['Date', 'Customer', 'Phone', 'Assigned Shop', 'SR Name', 'Total', 'Paid'], deviceAll.map(d => {
                                    const shop = myShops.find(s => String(s._id) === String(d.shopkeeper_id?._id || d.shopkeeper_id));
                                    const sr = mySRs.find(s => String(s._id) === String(shop?.parent_id));
                                    return [new Date(d.createdAt).toLocaleDateString(), d.customer_name, d.customer_phone, d.shopkeeper_id?.name || shop?.business_name || 'N/A', sr?.name || 'N/A', `BDT ${d.total_price}`, `BDT ${d.paid_so_far}`];
                                }))} className="text-[9px] bg-teal-600 hover:bg-teal-500 text-white px-3 py-1 rounded transition-all">📄 PDF</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[9px] whitespace-nowrap uppercase font-bold">
                                    <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                                    <tr>
                                        <th className="p-4">Install Date</th>
                                        <th className="p-4">Customer Details</th>
                                        <th className="p-4">Assigned Shop</th>
                                        <th className="p-4 text-indigo-300">SR Name</th>
                                        <th className="p-4 text-right">Price Matrix</th>
                                        <th className="p-4 text-center">Status</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#273A60]">
                                    {deviceList.map((dev) => {
                                        // Find Shop and SR for the extra column
                                        const shop = myShops.find(s => String(s._id) === String(dev.shopkeeper_id?._id || dev.shopkeeper_id));
                                        const sr = mySRs.find(s => String(s._id) === String(shop?.parent_id));

                                        return (
                                            <tr key={dev._id} className="hover:bg-[#162447] transition-colors">
                                                <td className="p-4 text-gray-400">{new Date(dev.createdAt).toLocaleDateString()}</td>
                                                <td className="p-4">
                                                    <div className="text-white font-black">{dev.customer_name}</div>
                                                    <div className="text-gray-500 font-mono">{dev.customer_phone}</div>
                                                </td>
                                                <td className="p-4 text-teal-400">{dev.shopkeeper_id?.name || shop?.business_name || 'N/A'}</td>
                                                <td className="p-4 text-indigo-400">{sr ? sr.name : 'N/A'}</td>
                                                <td className="p-4 text-right">
                                                    <div className="text-gray-400">Total: ৳{dev.total_price}</div>
                                                    <div className="text-green-500">Paid: ৳{dev.paid_so_far}</div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={dev.is_locked ? 'text-red-500 font-black' : 'text-green-500 font-black'}>● {dev.is_locked ? 'LOCKED' : 'ONLINE'}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {deviceList.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-600 italic">No devices active under your managed nodes.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 bg-[#050A15] border-t border-[#273A60] flex justify-between items-center text-[9px] text-gray-500 font-black">
                                <button onClick={() => changePage('device', currentPage.device - 1, deviceMax)} className="hover:text-white">◀ PREV</button>
                                <span>PAGE {currentPage.device} OF {deviceMax}</span>
                                <button onClick={() => changePage('device', currentPage.device + 1, deviceMax)} className="hover:text-white">NEXT ▶</button>
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
                            <p className="text-[10px] text-gray-400 mb-6">You are requesting funds from the Master Admin. You can request your full balance or a partial amount.</p>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="text-[9px] text-gray-500 tracking-widest">Available Balance</label>
                                    <div className="text-white font-mono text-xl font-black">৳{calculatedBalance}</div>
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 tracking-widest">Amount to Withdraw</label>
                                    <input
                                        type="number"
                                        max={calculatedBalance}
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

                {shopApproveModal.isOpen && shopApproveModal.shop && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[150]">
                        <div className="bg-[#111A35] border border-orange-500/50 rounded-xl p-8 max-w-md w-full shadow-2xl relative">
                            <button onClick={() => setShopApproveModal({isOpen: false, shop: null})} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 font-black">✕</button>
                            <h3 className="text-orange-400 font-black tracking-widest mb-4 uppercase">Shop Approval Action</h3>
                            <p className="text-[10px] text-gray-300 mb-6 uppercase">Do you approve this shop generated by your SR?</p>

                            <div className="bg-[#050A15] p-4 rounded border border-[#273A60] mb-6 uppercase">
                                <div className="text-white font-bold">{shopApproveModal.shop.business_name}</div>
                                <div className="text-gray-500 text-[9px] mt-1">Owner: {shopApproveModal.shop.name}</div>
                                <div className="text-blue-400 font-mono text-[9px] mt-1">Phone: {shopApproveModal.shop.phone}</div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => processShopApproval(shopApproveModal.shop._id, 'APPROVE')} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded font-black tracking-widest shadow-lg">APPROVE</button>
                                <button onClick={() => processShopApproval(shopApproveModal.shop._id, 'REJECT')} className="flex-1 bg-red-900/40 border border-red-500 text-red-500 hover:text-white py-3 rounded font-black tracking-widest shadow-lg">REJECT</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 🚀 VIEW SHOP MODAL */}
                {viewShopModal.isOpen && viewShopModal.shop && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[160]">
                        <div className="bg-[#111A35] border border-blue-500/30 rounded-xl w-full max-w-2xl p-8 shadow-2xl relative font-mono uppercase font-bold text-[10px]">
                            <button onClick={() => setViewShopModal({isOpen: false, shop: null})} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 font-black text-xl">✕</button>

                            <h2 className="text-xl font-black text-white mb-6 border-b border-[#273A60] pb-4">
                                <span className="text-blue-500">SHOP PROFILE:</span> {viewShopModal.shop.business_name || 'N/A'}
                            </h2>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-[#0A1128] p-4 rounded border border-[#273A60]">
                                    <span className="text-gray-500">OWNER NAME:</span><br/>
                                    <span className="text-white text-xs">{viewShopModal.shop.name}</span>
                                </div>
                                <div className="bg-[#0A1128] p-4 rounded border border-[#273A60]">
                                    <span className="text-gray-500">PHONE NUMBER:</span><br/>
                                    <span className="text-blue-400 text-xs">{viewShopModal.shop.phone}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-[#0A1128] p-4 rounded border border-[#273A60]">
                                    <span className="text-gray-500">FATHER'S NAME:</span><br/>
                                    <span className="text-white">{viewShopModal.shop.father_name || 'N/A'}</span>
                                </div>
                                <div className="bg-[#0A1128] p-4 rounded border border-[#273A60]">
                                    <span className="text-gray-500">MOTHER'S NAME:</span><br/>
                                    <span className="text-white">{viewShopModal.shop.mother_name || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="bg-[#0A1128] p-4 rounded border border-[#273A60] mb-6">
                                <span className="text-gray-500">FULL ADDRESS:</span><br/>
                                <span className="text-white">
                                    {viewShopModal.shop.address?.line1 && `${viewShopModal.shop.address.line1}, `}
                                    {viewShopModal.shop.address?.line2 && `${viewShopModal.shop.address.line2}, `}
                                    {viewShopModal.shop.address?.thana && `${viewShopModal.shop.address.thana}, `}
                                    {viewShopModal.shop.address?.district && `${viewShopModal.shop.address.district}, `}
                                    {viewShopModal.shop.address?.division}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#0A1128] p-4 rounded border border-[#273A60]">
                                    <span className="text-gray-500">NID NUMBER:</span><br/>
                                    <span className="text-white">{viewShopModal.shop.nid_number || 'N/A'}</span>
                                </div>
                                <div className="bg-[#0A1128] p-4 rounded border border-[#273A60]">
                                    <span className="text-gray-500">TRADE LICENSE:</span><br/>
                                    <span className="text-white">{viewShopModal.shop.trade_license || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
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

export default DistributorDashboard;