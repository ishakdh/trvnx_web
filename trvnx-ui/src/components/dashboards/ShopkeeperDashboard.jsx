import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const ShopkeeperDashboard = ({ user, onLogout }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [devices, setDevices] = useState([]);
    const [liveBalance, setLiveBalance] = useState(user?.balance || 0);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('HOME');

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });

    // --- ALL UI MODAL STATES ---
    const [showRegModal, setShowRegModal] = useState(false);
    const [viewDetailsModal, setViewDetailsModal] = useState({ isOpen: false, device: null });
    const [noticeModal, setNoticeModal] = useState({ isOpen: false, title: '', message: '' });

    // --- 🚀 NEW POPUP STATES ---
    const [showReceiveEmiModal, setShowReceiveEmiModal] = useState(false);
    const [showExtensionModal, setShowExtensionModal] = useState(false);
    const [confirmationPopup, setConfirmationPopup] = useState({ isOpen: false, message: '', onConfirm: null });
    const [otpModal, setOtpModal] = useState({ isOpen: false, otp: '' });
    const [selectedMonth, setSelectedMonth] = useState('1');
    const [extensionDate, setExtensionDate] = useState('');

    // 🚀 NEW STATE: Action Modal for Block/Unblock/Track reasons
    const [actionModal, setActionModal] = useState({ isOpen: false, device: null, action: '', reason: 'Due to user request', customReason: '' });

    // --- INPUT STATES ---
    const [paymentAmount, setPaymentAmount] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    // 🚀 NEW: INSTALL APP MODAL STATES
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [systemConfig, setSystemConfig] = useState({});

    // 🚀 NEW: PAYMENT GATEWAY STATES
    const [gatewayConfig, setGatewayConfig] = useState(null);
    const [selectedGateway, setSelectedGateway] = useState(null);
    const [txIdInput, setTxIdInput] = useState('');
    const [txAmountInput, setTxAmountInput] = useState('');

    // --- FULL REGISTRATION FORM STATE ---
    const [regForm, setRegForm] = useState({
        customer_name: '', customer_phone: '', father_name: '', mother_name: '',
        present_address: '', permanent_address: '', product_name: '', product_model: '',
        imei: '', imei2: '', total_price: '', down_payment: '',
        installment_months: '1', emi_start_date: '',
        customer_photo: null, nid_card: null
    });

    // Refs for safe polling
    const isFetchingRef = useRef(false);
    const intervalRef = useRef(null);

    // --- DATA RECOVERY & SYNC ---
    const fetchDevices = async () => {
        // Prevent concurrent fetches if one is already running
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            const res = await fetch(`http://localhost:5000/api/devices/shop/${user.id || user._id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDevices(data.devices || []);
                setLiveBalance(data.live_balance || 0);
            }
        } catch (error) {
            console.error("Database sync failed:", error);
        } finally {
            isFetchingRef.current = false;
        }
    };

    // 🚀 NEW: Fetch Active Payment Gateways
    const fetchGateways = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/settings`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` } });
            if (res.ok) {
                const data = await res.json();
                setGatewayConfig(data);
                setSystemConfig(data || {}); // 🚀 ADDED TO GET QR CODES
            }
        } catch (error) { console.error("Gateway fetch failed"); }
    };

    // 🔥 THE FIX: Robust Polling Setup
    useEffect(() => {
        // Initial fetch
        fetchDevices();
        fetchGateways();

        // Clear any existing interval just in case
        if (intervalRef.current) clearInterval(intervalRef.current);

        // Set up the new interval (every 10 seconds is safer than 5)
        intervalRef.current = setInterval(fetchDevices, 10000);

        // Cleanup function runs when component unmounts
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            isFetchingRef.current = false;
        };
    }, []); // Empty dependency array ensures this only runs once on mount


    // 🚀 NEW: Submitting Transaction ID to backend
    const submitTransactionId = async (e) => {
        e.preventDefault();
        if(!txIdInput || !txAmountInput || !selectedGateway) return alert("Fill all fields");

        try {
            const res = await fetch(`http://localhost:5000/api/transactions/submit-mfs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify({
                    transactionId: txIdInput,
                    amount: txAmountInput,
                    gateway: selectedGateway,
                    shopkeeperId: user.id || user._id
                })
            });
            const data = await res.json();
            if (res.ok) {
                setNoticeModal({ isOpen: true, title: "PAYMENT IN REVIEW", message: "Transaction ID submitted successfully. Waiting for SMS Sync confirmation." });
                setTxIdInput(''); setTxAmountInput(''); setSelectedGateway(null);
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (err) { alert("Failed to connect to server."); }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert(`Copied: ${text}`);
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

    // --- EMI & FINANCIAL LOGIC ---
    const getTrueEmi = (device) => {
        if (!device) return 0;
        const tp = Number(device.total_price) || 0;
        const dp = Number(device.down_payment) || 0;
        const months = Number(device.installment_months) || 1;
        return Math.round((tp - dp) / months);
    };

    const isMissingHeartbeat = (dateString) => {
        if (!dateString) return true;
        return (new Date() - new Date(dateString)) / (1000 * 60) > 125; // 2 Hour Lost Signal
    };

    const generateEmiSchedule = (device) => {
        if (!device) return [];
        const schedule = [];
        const tp = Number(device.total_price) || 0;
        const dp = Number(device.down_payment) || 0;
        const months = Number(device.installment_months) || 1;
        let remainingPaid = (Number(device.paid_so_far) || 0) - dp;
        let baseDate = new Date(device.createdAt || Date.now());
        const trueBaseEmi = getTrueEmi(device);

        let firstDueFound = false;

        for (let i = 1; i <= months; i++) {
            baseDate.setMonth(baseDate.getMonth() + 1);
            let expectedAmount = i === months ? (tp - dp) - (trueBaseEmi * (months - 1)) : trueBaseEmi;
            let status = "DUE", color = "text-red-500";

            if (remainingPaid >= expectedAmount) {
                status = "PAID"; color = "text-green-500"; remainingPaid -= expectedAmount;
            } else if (remainingPaid > 0) {
                status = `PARTIAL (৳${remainingPaid})`; color = "text-yellow-500"; remainingPaid = 0;
            }

            let displayDate = new Date(baseDate).toLocaleDateString();

            if (!firstDueFound && (status === "DUE" || status.startsWith("PARTIAL"))) {
                if (device.next_due_date) {
                    displayDate = new Date(device.next_due_date).toLocaleDateString();
                }
                firstDueFound = true;
            }

            schedule.push({ month: i, date: displayDate, amount: expectedAmount, statusText: status, color: color });
        }
        return schedule;
    };

    // --- DASHBOARD ACTIONS ---
    const handleAction = async (deviceId, action, reason = "System Action") => {
        await fetch(`http://localhost:5000/api/devices/toggle-lock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
            body: JSON.stringify({ deviceId, action, reason })
        });
        fetchDevices();
    };

    const handleTrack = async (device, reason = "System Action") => {
        const res = await fetch(`http://localhost:5000/api/devices/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
            body: JSON.stringify({ deviceId: device._id, reason })
        });
        if (res.ok) setNoticeModal({ isOpen: true, title: "Tracking Signal", message: "Signal sent. GPS link will update in table." });
    };

    // 🚀 UPDATE 2: Added skipConfirm parameter for Auto-Triggering
    const triggerUninstall = async (device, skipConfirm = false) => {
        if (!skipConfirm && !window.confirm(`WARNING: Release ${device.customer_name} permanently?`)) return;
        await fetch(`http://localhost:5000/api/devices/uninstall`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
            body: JSON.stringify({ deviceId: device._id })
        });
        fetchDevices();
    };

    // 🚀 RECEIVE EMI LOGIC WITH POPUPS
    const triggerReceivePayment = () => {
        const device = viewDetailsModal.device;
        const amount = Number(paymentAmount);
        const trueEmi = getTrueEmi(device);
        if (!amount || amount <= 0) return alert("Enter a valid amount");

        const executePayment = async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/devices/collect-emi`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                    body: JSON.stringify({ deviceId: device._id, amountPaid: amount, emiMonth: selectedMonth })
                });
                if (res.ok) {
                    const targetOtp = device.offline_otps?.find(o => o.month === Number(selectedMonth))?.open_otp || "OFFLINE_CODE";
                    setOtpModal({ isOpen: true, otp: targetOtp });
                    setShowReceiveEmiModal(false);
                    setPaymentAmount('');

                    // 🚀 UPDATE 2: Auto Trigger Uninstall if Fully Paid
                    const newPaidSoFar = Number(device.paid_so_far) + amount;
                    if (newPaidSoFar >= Number(device.total_price)) {
                        triggerUninstall(device, true);
                    }

                    fetchDevices();
                }
            } catch (err) { console.error(err); }
        };

        if (amount > trueEmi) {
            setConfirmationPopup({ isOpen: true, message: `Your EMI is BDT ${trueEmi} and receive amount is ${amount}. rest amount will deduct on next EMI`, onConfirm: executePayment });
        } else if (amount < trueEmi) {
            setConfirmationPopup({ isOpen: true, message: `Your EMI is BDT ${trueEmi} and receive amount is ${amount}. due amount will add to next EMI`, onConfirm: executePayment });
        } else {
            executePayment();
        }
    };

    // 🚀 EMI EXTENSION LOGIC
    const handleExtension = async () => {
        const device = viewDetailsModal.device;
        if (!extensionDate) return alert("Select date");
        try {
            const res = await fetch(`http://localhost:5000/api/devices/extend-due-date`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify({ deviceId: device._id, newDate: extensionDate, month: selectedMonth })
            });
            if (res.ok) {
                const extOtp = device.offline_otps?.find(o => o.month === Number(selectedMonth))?.ex_otp || "EXT_CODE";
                setOtpModal({ isOpen: true, otp: extOtp });
                setShowExtensionModal(false);
                fetchDevices();
            } else {
                alert("Server returned 404. Did you restart your backend Node.js server?");
            }
        } catch (err) { console.error(err); }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        const tp = Number(regForm.total_price) || 0;
        const dp = Number(regForm.down_payment) || 0;
        const months = Number(regForm.installment_months) || 1;
        const calculatedEmi = Math.round((tp - dp) / months);

        const payload = {
            ...regForm,
            customer_address: regForm.present_address,
            monthly_emi: calculatedEmi,
            product_name: regForm.product_model,
            shopkeeper_id: user.id || user._id,
            next_due_date: regForm.emi_start_date || new Date()
        };

        try {
            const res = await fetch(`http://localhost:5000/api/devices/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}`
                },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if(res.ok) {
                setShowRegModal(false);
                fetchDevices();
                setNoticeModal({
                    isOpen: true,
                    title: "REGISTRATION SUCCESS",
                    message: `License Key: ${result.licenseKey}. Use this to activate the app on the phone.`
                });
            } else {
                alert("Registration Error: " + result.message);
            }
        } catch (err) {
            console.error(err);
            alert("Connection failed. Check if backend is running.");
        }
    };

    // 🚀 NEW: A5 THEMED PDF GENERATOR WITH AUTOMATED SIGNATURE FOOTER
    const generateStyledPDF = (device, type) => {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a5' });
        const trueEmi = getTrueEmi(device);
        const amt = Number(paymentAmount) || 0;

        doc.setFillColor(10, 17, 40); doc.rect(0, 0, 148, 35, 'F');
        doc.setTextColor(33, 150, 243); doc.setFontSize(16); doc.text("LINDUX EMI SECURITY CENTER", 10, 15);
        doc.setTextColor(255, 255, 255); doc.setFontSize(7);
        doc.text(`SHOP: ${user.name || 'Admin'}`, 10, 22);
        doc.text(`ADDR: ${user.address || 'Bangladesh'}`, 10, 26);
        doc.text(`PHONE: ${user.phone || 'N/A'}`, 10, 30);
        doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.text(type.toUpperCase(), 74, 45, { align: 'center' });
        doc.setFontSize(8);
        doc.text(`CUST ID: ${device._id.slice(-8).toUpperCase()}`, 10, 55);
        doc.text(`NAME: ${device.customer_name}`, 10, 60);
        doc.text(`PHONE: ${device.customer_phone}`, 10, 65);

        let body = [];
        if (type === 'invoice') {
            let desc = `EMI Month ${selectedMonth} Payment`;
            if (amt > trueEmi) desc += ` (> EMI: Excess Adjusted)`;
            if (amt < trueEmi && amt > 0) desc += ` (< EMI: Due Adjusted)`;
            body = [[new Date().toLocaleDateString(), desc, `BDT ${amt}`]];
        } else {
            body = [
                ['Total Price', 'Device Cost', `BDT ${device.total_price}`],
                [new Date(device.createdAt).toLocaleDateString(), 'Downpayment Received', `BDT ${device.down_payment}`],
                [new Date().toLocaleDateString(), 'Paid So Far', `BDT ${device.paid_so_far}`],
                ['-', 'Current EMI Due', `BDT ${device.total_price - device.paid_so_far}`]
            ];
        }

        autoTable(doc, { startY: 70, head: [['Date', 'Description', 'Amount']], body: body, theme: 'grid', headStyles: { fillColor: [33, 150, 243] } });

        doc.setFontSize(7);
        doc.text(`** This is an automated generated ${type}, signature not require`, 74, 200, { align: 'center' });
        doc.save(`${type}_${device.customer_name}.pdf`);
    };

    // --- RENDER LOGIC ---
    const filtered = devices.filter(d => {
        if (activeFilter === 'LOCKED') return d.is_locked;
        if (activeFilter === 'UNLOCKED') return !d.is_locked;
        if (activeFilter === 'LOST') return isMissingHeartbeat(d.last_heartbeat);
        return true;
    });

    const searched = filtered.filter(d => d.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPages = Math.ceil(searched.length / ITEMS_PER_PAGE) || 1;
    const paginated = searched.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="min-h-screen bg-[#050A15] text-white font-mono flex relative uppercase">
            <aside
                className={`${isSidebarOpen ? 'w-64' : 'w-12 px-2'} bg-[#0A1128] border-r border-[#273A60] py-6 hidden md:flex flex-col transition-all duration-300 overflow-hidden whitespace-nowrap shrink-0 z-20`}
                onMouseEnter={() => setIsSidebarOpen(true)}
                onMouseLeave={() => setIsSidebarOpen(false)}
            >
                <div className="flex items-center gap-3 mb-8 px-4">
                    <div className="text-xl text-gray-500">≡</div>
                    {isSidebarOpen && <h1 className="text-lg font-black text-gray-300 tracking-tighter">Lindux EMI</h1>}
                </div>
                <div className="text-[8px] text-gray-500 font-bold mb-8 tracking-widest px-4">
                    {isSidebarOpen && `OPERATOR: ${user?.name || 'BHAI BHAI TELECOM'}`}
                </div>
                <nav className="space-y-2 flex flex-col h-[calc(100vh-200px)] text-[10px] font-bold">
                    <button onClick={() => setActiveFilter('HOME')} className={`px-4 py-3 rounded text-left flex items-center gap-4 ${activeFilter === 'HOME' ? 'bg-[#0F172A] text-pink-400 border-l-4 border-pink-500' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <span className="text-sm">🏠</span>
                        {isSidebarOpen && <span>Home</span>}
                    </button>

                    <button onClick={() => setShowRegModal(true)} className="px-4 py-3 rounded text-left text-gray-400 hover:bg-gray-800 flex items-center gap-4">
                        <span className="text-sm">🛒</span>
                        {isSidebarOpen && <span>New Sale</span>}
                    </button>

                    <button onClick={() => setActiveFilter('PAYMENT')} className={`px-4 py-3 rounded text-left flex items-center gap-4 ${activeFilter === 'PAYMENT' ? 'bg-[#0F172A] text-pink-400 border-l-4 border-pink-500' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <span className="text-sm">💳</span>
                        {isSidebarOpen && <span>Wallet Recharge</span>}
                    </button>

                    <button onClick={() => setActiveFilter('TOTAL')} className={`px-4 py-3 rounded text-left flex items-center gap-4 ${activeFilter === 'TOTAL' ? 'bg-[#0F172A] text-white border-l-4 border-blue-500' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <span className="text-sm">📱</span>
                        {isSidebarOpen && <span>Total Devices</span>}
                    </button>
                    <button onClick={() => setActiveFilter('LOCKED')} className={`px-4 py-3 rounded text-left flex items-center gap-4 ${activeFilter === 'LOCKED' ? 'bg-[#0F172A] text-white border-l-4 border-red-500' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <span className="text-sm">🔒</span>
                        {isSidebarOpen && <span>Locked</span>}
                    </button>
                    <button onClick={() => setActiveFilter('UNLOCKED')} className={`px-4 py-3 rounded text-left flex items-center gap-4 ${activeFilter === 'UNLOCKED' ? 'bg-[#0F172A] text-white border-l-4 border-green-500' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <span className="text-sm">🔓</span>
                        {isSidebarOpen && <span>Online</span>}
                    </button>
                    <button onClick={() => setActiveFilter('LOST')} className={`px-4 py-3 rounded text-left flex items-center gap-4 ${activeFilter === 'LOST' ? 'bg-[#0F172A] text-white border-l-4 border-orange-500' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <span className="text-sm">⚠️</span>
                        {isSidebarOpen && <span>Missing Heartbeat</span>}
                    </button>

                    <div className="mt-auto pt-8 pb-4 flex flex-col gap-2">
                        <button onClick={() => setShowPasswordModal(true)} className="w-full bg-transparent text-gray-500 hover:text-white px-4 py-3 rounded text-[10px] font-bold text-left hover:bg-gray-800 transition-all uppercase tracking-widest flex items-center gap-4">
                            <span className="text-sm">🔒</span>
                            {isSidebarOpen && <span>CHANGE PASSWORD</span>}
                        </button>
                        <button onClick={onLogout} className="w-full bg-red-900/10 text-red-500 border border-red-900/50 px-4 py-3 rounded text-[10px] font-black text-left hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest flex items-center gap-4">
                            <span className="text-sm">⏻</span>
                            {isSidebarOpen && <span>LOGOUT</span>}
                        </button>
                    </div>
                </nav>
            </aside>
            <main className="flex-1 p-6 overflow-y-auto w-full">

                {/* 🚀 NEW: SECURE PAYMENT GATEWAY UI */}
                {activeFilter === 'PAYMENT' ? (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="bg-gradient-to-r from-pink-900/20 to-orange-900/20 border border-pink-500/30 rounded-xl p-8 shadow-2xl relative overflow-hidden">
                            <h2 className="text-2xl font-black text-white mb-2 tracking-widest uppercase">Secure Wallet Recharge</h2>

                            {/* 🚀 FIXED: DYNAMIC PAYMENT INSTRUCTION TEXT */}
                            <p className="text-gray-400 text-xs mb-6 font-bold tracking-widest leading-relaxed">
                                {!selectedGateway ? (
                                    <>
                                        Please select a gateway below.<br/>
                                        <span className="text-[10px] text-pink-400 italic">নিচের যেকোনো একটি মাধ্যম সিলেক্ট করুন।</span>
                                    </>
                                ) : selectedGateway.type.includes('API') ? (
                                    <>
                                        Please make payment<br/>
                                        <span className="text-[10px] text-pink-400 italic">অনুগ্রহ করে পেমেন্ট করুন।</span>
                                    </>
                                ) : selectedGateway.type.includes('Merchant') ? (
                                    <>
                                        Please make payment to the below number and input your transection ID along with amount<br/>
                                        <span className="text-[10px] text-pink-400 italic">অনুগ্রহ করে নিচের নম্বরে পেমেন্ট করুন এবং অ্যামাউন্ট সহ ট্রানজ্যাকশন আইডি সাবমিট করুন।</span>
                                    </>
                                ) : (
                                    <>
                                        Please send money to the below number and input your transection ID along with amount<br/>
                                        <span className="text-[10px] text-pink-400 italic">অনুগ্রহ করে নিচের নম্বরে সেন্ড মানি করুন এবং অ্যামাউন্ট সহ ট্রানজ্যাকশন আইডি সাবমিট করুন।</span>
                                    </>
                                )}
                            </p>

                            {!selectedGateway ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {gatewayConfig?.bkash_merchant && (
                                        <div onClick={() => setSelectedGateway({ type: 'bKash Merchant', number: gatewayConfig.bkash_merchant_number, color: 'pink' })} className="cursor-pointer bg-[#050A15] border border-pink-500/50 p-6 rounded-lg hover:bg-pink-900/20 transition-all flex flex-col items-center justify-center text-center">
                                            <div className="text-pink-500 text-3xl mb-2">🛍️</div>
                                            <h3 className="text-pink-400 font-black tracking-widest text-sm">bKash Merchant</h3>
                                            <p className="text-[8px] text-gray-500 mt-2 uppercase">Make Payment</p>
                                        </div>
                                    )}
                                    {gatewayConfig?.bkash_personal && (
                                        <div onClick={() => setSelectedGateway({ type: 'bKash Personal', number: gatewayConfig.bkash_personal_number, color: 'pink' })} className="cursor-pointer bg-[#050A15] border border-pink-500/50 p-6 rounded-lg hover:bg-pink-900/20 transition-all flex flex-col items-center justify-center text-center">
                                            <div className="text-pink-500 text-3xl mb-2">👤</div>
                                            <h3 className="text-pink-400 font-black tracking-widest text-sm">bKash Personal</h3>
                                            <p className="text-[8px] text-gray-500 mt-2 uppercase">Send Money</p>
                                        </div>
                                    )}
                                    {gatewayConfig?.nagad_merchant && (
                                        <div onClick={() => setSelectedGateway({ type: 'Nagad Merchant', number: gatewayConfig.nagad_merchant_number, color: 'orange' })} className="cursor-pointer bg-[#050A15] border border-orange-500/50 p-6 rounded-lg hover:bg-orange-900/20 transition-all flex flex-col items-center justify-center text-center">
                                            <div className="text-orange-500 text-3xl mb-2">🛍️</div>
                                            <h3 className="text-orange-400 font-black tracking-widest text-sm">Nagad Merchant</h3>
                                            <p className="text-[8px] text-gray-500 mt-2 uppercase">Make Payment</p>
                                        </div>
                                    )}
                                    {gatewayConfig?.nagad_personal && (
                                        <div onClick={() => setSelectedGateway({ type: 'Nagad Personal', number: gatewayConfig.nagad_personal_number, color: 'orange' })} className="cursor-pointer bg-[#050A15] border border-orange-500/50 p-6 rounded-lg hover:bg-orange-900/20 transition-all flex flex-col items-center justify-center text-center">
                                            <div className="text-orange-500 text-3xl mb-2">👤</div>
                                            <h3 className="text-orange-400 font-black tracking-widest text-sm">Nagad Personal</h3>
                                            <p className="text-[8px] text-gray-500 mt-2 uppercase">Send Money</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-[#050A15] border border-[#273A60] rounded-lg p-6">
                                    <div className="flex justify-between items-center mb-6 border-b border-[#273A60] pb-4">
                                        <h3 className={`font-black tracking-widest text-lg ${selectedGateway.color === 'pink' ? 'text-pink-500' : 'text-orange-500'}`}>{selectedGateway.type}</h3>
                                        <button onClick={() => setSelectedGateway(null)} className="text-[9px] text-gray-400 hover:text-white border border-gray-600 px-3 py-1 rounded">◀ BACK</button>
                                    </div>

                                    <div className="flex items-center gap-4 mb-8 bg-[#0A1128] p-4 rounded border border-gray-800">
                                        <div className="flex-1">
                                            <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Target Account Number</p>
                                            <p className="text-2xl font-mono text-white font-black tracking-widest">{selectedGateway.number}</p>
                                        </div>
                                        <button onClick={() => copyToClipboard(selectedGateway.number)} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest ${selectedGateway.color === 'pink' ? 'bg-pink-600 hover:bg-pink-500' : 'bg-orange-600 hover:bg-orange-500'} text-white shadow-lg`}>Copy</button>
                                    </div>

                                    <form onSubmit={submitTransactionId} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[9px] text-gray-400 uppercase tracking-widest mb-1 block">Input Amount Sent (৳)</label>
                                                <input required type="number" placeholder="e.g. 500" value={txAmountInput} onChange={(e) => setTxAmountInput(e.target.value)} className="w-full bg-[#0A1128] border border-[#273A60] p-4 rounded text-white font-mono outline-none focus:border-white" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-gray-400 uppercase tracking-widest mb-1 block">Enter Transaction ID</label>
                                                <input required type="text" placeholder="e.g. 9J5BQX7T" value={txIdInput} onChange={(e) => setTxIdInput(e.target.value)} className="w-full bg-[#0A1128] border border-[#273A60] p-4 rounded text-white font-mono outline-none focus:border-white uppercase" />
                                            </div>
                                        </div>
                                        <button type="submit" className="w-full bg-green-600 hover:bg-green-500 py-4 rounded text-[11px] font-black uppercase tracking-[0.3em] shadow-lg shadow-green-900/40 mt-4">Verify Payment & Recharge</button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeFilter === 'HOME' ? (
                    <div>
                        <div className="flex justify-end mb-4 mt-4">
                            <button
                                onClick={() => setShowInstallModal(true)}
                                className="bg-green-600/20 border border-green-500 text-green-400 hover:bg-green-500 hover:text-white px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2"
                            >
                                📲 INSTALL APP
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 text-[10px] font-black">
                            <div onClick={() => setActiveFilter('PAYMENT')} className="cursor-pointer bg-gradient-to-br from-[#1E1B4B] to-[#0F172A] p-8 rounded-xl border border-indigo-500/20 shadow-xl relative hover:border-indigo-500/50 transition-all">
                                <div className="text-gray-400 mb-2 text-[10px] uppercase tracking-widest">Recharge Wallet</div>
                                <div className="text-4xl font-black text-white mt-4">💳</div>
                                <div className="absolute top-4 right-4 text-indigo-500 opacity-80 text-xl">↗</div>
                            </div>
                            <div className="bg-gradient-to-br from-[#0A1128] to-[#050A15] p-8 rounded-xl border border-blue-500/20 shadow-xl relative">
                                <div className="text-gray-400 mb-2 text-[10px] uppercase tracking-widest">Wallet Balance</div>
                                <div className="text-4xl font-black text-blue-400 mt-4">৳{liveBalance.toLocaleString()}</div>
                                <div className="absolute top-4 right-4 text-blue-500 opacity-80 text-xl">💰</div>
                            </div>
                            <div onClick={() => setActiveFilter('TOTAL')} className="cursor-pointer bg-gradient-to-br from-[#0A1128] to-[#050A15] p-8 rounded-xl border border-gray-500/20 shadow-xl relative hover:border-gray-500/50 transition-all">
                                <div className="text-gray-400 mb-2 text-[10px] uppercase tracking-widest">Total Device</div>
                                <div className="text-4xl font-black text-white mt-4">{devices.length}</div>
                                <div className="absolute top-4 right-4 text-gray-500 opacity-80 text-xl">📱</div>
                            </div>
                            <div onClick={() => setActiveFilter('LOCKED')} className="cursor-pointer bg-gradient-to-br from-[#450A0A] to-[#0F172A] p-8 rounded-xl border border-red-500/20 shadow-xl relative hover:border-red-500/50 transition-all">
                                <div className="text-gray-400 mb-2 text-[10px] uppercase tracking-widest">Lock Device</div>
                                <div className="text-4xl font-black text-white mt-4">{devices.filter(d => d.is_locked).length}</div>
                                <div className="absolute top-4 right-4 text-red-500 opacity-80 text-xl">🔒</div>
                            </div>
                            <div onClick={() => setActiveFilter('UNLOCKED')} className="cursor-pointer bg-gradient-to-br from-[#064E3B] to-[#0F172A] p-8 rounded-xl border border-green-500/20 shadow-xl relative hover:border-green-500/50 transition-all">
                                <div className="text-gray-400 mb-2 text-[10px] uppercase tracking-widest">Unlock Device</div>
                                <div className="text-4xl font-black text-white mt-4">{devices.filter(d => !d.is_locked).length}</div>
                                <div className="absolute top-4 right-4 text-green-500 opacity-80 text-xl">🔓</div>
                            </div>
                            <div onClick={() => setActiveFilter('LOST')} className="cursor-pointer bg-gradient-to-br from-[#431407] to-[#0F172A] p-8 rounded-xl border border-orange-500/20 shadow-xl relative hover:border-orange-500/50 transition-all">
                                <div className="text-gray-400 mb-2 text-[10px] uppercase tracking-widest">Missing Heartbeat</div>
                                <div className="text-4xl font-black text-white mt-4">{devices.filter(d => isMissingHeartbeat(d.last_heartbeat)).length}</div>
                                <div className="absolute top-4 right-4 text-orange-500 opacity-80 text-xl">⚠️</div>
                            </div>
                            <div className="bg-gradient-to-br from-[#0A1128] to-[#050A15] p-8 rounded-xl border border-purple-500/20 shadow-xl relative">
                                <div className="text-gray-400 mb-2 text-[10px] uppercase tracking-widest">Full Uninstall Device</div>
                                <div className="text-4xl font-black text-purple-400 mt-4">{devices.filter(d => Number(d.paid_so_far) >= Number(d.total_price)).length}</div>
                                <div className="absolute top-4 right-4 text-purple-500 opacity-80 text-xl">✓</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* --- SEARCH BAR & PAGINATION --- */}
                        <div className="flex justify-between items-center mb-4 bg-[#0A1128] p-3 rounded border border-[#273A60]">
                            <div className="flex items-center w-1/2">
                                <span className="text-blue-500 mr-3 ml-2 text-sm">🔍</span>
                                <input type="text" placeholder={`Search ${activeFilter} devices...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-xs w-full text-white placeholder-gray-600 font-bold" />
                            </div>
                            <div className="text-[9px] font-bold text-gray-500 flex gap-4 pr-4">
                                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} className="hover:text-white transition-colors">◀ PREV</button>
                                <span>PAGE {currentPage} OF {totalPages}</span>
                                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} className="hover:text-white transition-colors">NEXT ▶</button>
                            </div>
                        </div>

                        {/* --- DEVICE TABLE --- */}
                        <div className="bg-[#0A1128] border border-[#273A60] rounded overflow-hidden shadow-2xl">
                            <table className="w-full text-left text-[9px] font-bold uppercase whitespace-nowrap">
                                <thead className="bg-[#111A35] text-gray-500 border-b border-[#273A60]">
                                <tr>
                                    <th className="p-4">SL</th>
                                    <th className="p-4">Cust ID / Name</th>
                                    <th className="p-4">Contact & Address</th>
                                    <th className="p-4">IMEIs</th>
                                    <th className="p-4 text-center">Heartbeat</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Location</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-[#273A60]">
                                {paginated.map((dev, idx) => {
                                    const lost = isMissingHeartbeat(dev.last_heartbeat);
                                    const isPaidOff = Number(dev.paid_so_far) >= Number(dev.total_price);
                                    return (
                                        <tr key={dev._id} className="hover:bg-[#111A35] transition-colors">
                                            <td className="p-4 text-gray-600">{((currentPage - 1) * ITEMS_PER_PAGE) + idx + 1}</td>
                                            <td className="p-4">
                                                <div className="text-white mb-1 tracking-wider">{dev.customer_name}</div>
                                                <div className="text-[7px] text-blue-500">ID: {dev._id.slice(-6).toUpperCase()}</div>
                                                {/* 🚀 NEW: License Key Display synced with IMEI mapping */}
                                                <div className="text-[7px] text-pink-500 font-black mt-1 tracking-widest uppercase">Key: {dev.license_key || 'N/A'}</div>
                                            </td>
                                            <td className="p-4 text-gray-300">
                                                {dev.customer_phone}
                                                <div className="text-[7px] mt-1 text-gray-600 truncate max-w-[120px]">{dev.customer_address || 'N/A'}</div>
                                            </td>
                                            <td className="p-4 text-[8px] text-gray-500 tracking-wider">
                                                <div>1: <span className="text-gray-400">{dev.imei || 'N/A'}</span></div>
                                                <div className="mt-1">2: <span className="text-gray-400">{dev.imei2 || 'N/A'}</span></div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {isPaidOff ? (
                                                    <div className="text-gray-500">● COMPLETED<br/><span className="text-[7px]">RELEASED</span></div>
                                                ) : (
                                                    <>
                                                        <span className={lost ? "text-red-500" : "text-green-500"}>● {lost ? "LOST" : "ONLINE"}</span>
                                                        <div className="text-[7px] mt-1 text-gray-600 tracking-wider">
                                                            {dev.last_heartbeat ? new Date(dev.last_heartbeat).toLocaleString('en-US', {month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'}) : 'NEVER CONNECTED'}
                                                        </div>
                                                    </>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {isPaidOff ? (
                                                    <span className="text-gray-500">● RELEASED</span>
                                                ) : (
                                                    <span className={dev.is_locked ? 'text-red-500' : 'text-green-500'}>
                                                        ● {dev.is_locked ? 'LOCKED' : 'ONLINE'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {dev.diagnostics?.last_location?.lat ? (
                                                    <a href={`https://www.google.com/maps?q=${dev.diagnostics.last_location.lat},${dev.diagnostics.last_location.lng}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-400 transition-colors">VIEW MAP</a>
                                                ) : <span className="text-gray-600">NO SIGNAL</span>}
                                            </td>

                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setViewDetailsModal({isOpen: true, device: dev})} className="bg-transparent border border-[#273A60] text-gray-300 px-3 py-1.5 rounded text-[8px] hover:bg-gray-800 transition-all">VIEW</button>

                                                    {/* 🚀 UPDATE 2: Success Indicator logic checking license_status */}
                                                    {isPaidOff ? (
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => triggerUninstall(dev)} className="bg-[#ea580c] text-white px-3 py-1.5 rounded text-[8px] hover:bg-orange-500 transition-all shadow-lg">FULL UNINSTALL</button>
                                                            {dev.license_status === 'UNINSTALLED' && <span className="text-green-500 text-[8px] font-black">SUCCESS</span>}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {/* 🚀 UPDATE 3: Action Popup trigger */}
                                                            <button onClick={() => setActionModal({ isOpen: true, device: dev, action: dev.is_locked ? 'UNBLOCK' : 'BLOCK', reason: 'Due to user request', customReason: '' })} className={`${dev.is_locked ? 'bg-[#16a34a] hover:bg-green-500' : 'bg-[#dc2626] hover:bg-red-500'} text-white px-3 py-1.5 rounded text-[8px] transition-all shadow-lg`}>
                                                                {dev.is_locked ? 'UNBLOCK' : 'BLOCK'}
                                                            </button>

                                                            {/* 🚀 UPDATE 1: Track Button Grayed Out Logic */}
                                                            <button disabled={!dev.is_locked} onClick={() => setActionModal({ isOpen: true, device: dev, action: 'TRACK', reason: 'Due to user request', customReason: '' })} className={`${!dev.is_locked ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-[#2563eb] hover:bg-blue-500'} text-white px-3 py-1.5 rounded text-[8px] transition-all shadow-lg`}>
                                                                TRACK
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </main>

            {/* --- MODALS --- */}

            {/* 🚀 UPDATE 3: ACTION MODAL FOR BLOCK/UNBLOCK/TRACK REASONS */}
            {actionModal.isOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-[#0A1128] border border-blue-500/50 p-6 rounded-xl w-full max-w-sm shadow-2xl font-mono uppercase">
                        <h3 className="text-blue-500 font-black text-center mb-6 tracking-widest uppercase">{actionModal.action} DEVICE</h3>

                        <label className="text-[8px] text-gray-500 mb-1 block tracking-widest">Select Reason</label>
                        <select className="bg-[#050A15] border border-[#273A60] w-full p-3 text-xs mb-4 outline-none text-white" value={actionModal.reason} onChange={(e) => setActionModal({...actionModal, reason: e.target.value})}>
                            {actionModal.action === 'BLOCK' && (
                                <>
                                    <option value="Due to user request" className="bg-[#0A1128]">Due to user request</option>
                                    <option value="EMI Overdue" className="bg-[#0A1128]">EMI Overdue</option>
                                    <option value="User is missing" className="bg-[#0A1128]">User is missing</option>
                                    <option value="Other" className="bg-[#0A1128]">Other</option>
                                </>
                            )}
                            {actionModal.action === 'UNBLOCK' && (
                                <>
                                    <option value="Due to user request" className="bg-[#0A1128]">Due to user request</option>
                                    <option value="EMI Receive" className="bg-[#0A1128]">EMI Receive</option>
                                    <option value="Device recover successfully" className="bg-[#0A1128]">Device recover successfully</option>
                                    <option value="Other" className="bg-[#0A1128]">Other</option>
                                </>
                            )}
                            {actionModal.action === 'TRACK' && (
                                <>
                                    <option value="Due to user request" className="bg-[#0A1128]">Due to user request</option>
                                    <option value="EMI Overdue" className="bg-[#0A1128]">EMI Overdue</option>
                                    <option value="User is missing" className="bg-[#0A1128]">User is missing</option>
                                    <option value="Other" className="bg-[#0A1128]">Other</option>
                                </>
                            )}
                        </select>

                        {actionModal.reason === 'Other' && (
                            <>
                                <label className="text-[8px] text-gray-500 mb-1 block tracking-widest">Write Reason</label>
                                <input type="text" className="bg-[#050A15] border border-[#273A60] w-full p-3 text-xs mb-4 outline-none text-white" placeholder="Enter reason..." value={actionModal.customReason} onChange={(e) => setActionModal({...actionModal, customReason: e.target.value})} />
                            </>
                        )}

                        <div className="flex gap-2 mt-2">
                            <button onClick={() => setActionModal({isOpen: false, device: null, action: '', reason: 'Due to user request', customReason: ''})} className="flex-1 bg-gray-800 py-3 rounded text-[9px] font-black">CANCEL</button>
                            <button onClick={() => {
                                const finalReason = actionModal.reason === 'Other' ? actionModal.customReason : actionModal.reason;
                                if (actionModal.action === 'TRACK') {
                                    handleTrack(actionModal.device, finalReason);
                                } else {
                                    handleAction(actionModal.device._id, actionModal.action, finalReason);
                                }
                                setActionModal({isOpen: false, device: null, action: '', reason: 'Due to user request', customReason: ''});
                            }} className="flex-1 bg-blue-600 py-3 rounded text-[9px] font-black uppercase">Okay</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. VIEW DETAILS MODAL */}
            {viewDetailsModal.isOpen && viewDetailsModal.device && (
                <div className="fixed inset-0 bg-[#050A15]/95 flex items-center justify-center p-4 z-50">
                    <div className="bg-[#0A1128] border border-[#273A60] rounded-xl w-full max-w-2xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto font-mono uppercase">
                        <button onClick={() => setViewDetailsModal({isOpen: false})} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 font-black text-xl">✕</button>

                        <h2 className="text-2xl font-black text-white mb-2 tracking-widest">{viewDetailsModal.device.customer_name}</h2>

                        {/* CUSTOMER DETAILS HEADER */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-[9px] text-gray-400 bg-[#050A15] p-4 rounded border border-[#273A60]">
                            <div><span className="text-blue-500 font-black tracking-widest">CUSTOMER PHONE:</span><br/>{viewDetailsModal.device.customer_phone}</div>
                            <div className="md:col-span-2"><span className="text-blue-500 font-black tracking-widest">CUSTOMER ADDRESS:</span><br/>{viewDetailsModal.device.customer_address}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6 text-xs bg-[#050A15] p-4 border border-[#273A60] rounded uppercase">
                            <div><span className="text-gray-500">Total Price:</span> ৳{viewDetailsModal.device.total_price}</div>
                            <div><span className="text-gray-500">Paid So Far:</span> <span className="text-green-500">৳{viewDetailsModal.device.paid_so_far}</span></div>
                            <div className="col-span-2 text-red-500 font-black border-t border-[#273A60] pt-2 text-sm tracking-widest">CURRENT DUE: ৳{viewDetailsModal.device.total_price - viewDetailsModal.device.paid_so_far}</div>
                        </div>

                        <div className="bg-[#050A15] p-4 rounded border border-[#273A60] mb-6">
                            <h4 className="text-blue-500 font-bold text-[10px] mb-4 tracking-widest uppercase">Installment Schedule Tracker</h4>
                            <div className="max-h-40 overflow-y-auto pr-2 text-[10px]">
                                <table className="w-full text-left">
                                    <tbody className="divide-y divide-gray-800">
                                    {generateEmiSchedule(viewDetailsModal.device).map((emi, i) => (
                                        <tr key={i} className="border-b border-[#273A60]/50 hover:bg-gray-900">
                                            <td className="py-2 text-gray-500">MO {emi.month}</td>
                                            <td className="py-2">{emi.date}</td>
                                            <td className="py-2 font-bold">৳{emi.amount}</td>
                                            <td className={`py-2 text-right font-black tracking-widest ${emi.color}`}>{emi.statusText}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ACTION BUTTONS FOR POPUPS */}
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setShowReceiveEmiModal(true)} className="bg-green-600 py-3 text-[10px] font-black uppercase hover:bg-green-500 shadow-lg">Receive EMI</button>
                            <button onClick={() => setShowExtensionModal(true)} className="bg-blue-600 py-3 text-[10px] font-black uppercase hover:bg-blue-500 shadow-lg">EMI Extension</button>
                        </div>

                        {/* PDF DOWNLOAD SECTION */}
                        <div className="mt-6 flex justify-between gap-4">
                            <button onClick={() => generateStyledPDF(viewDetailsModal.device, 'invoice')} className="flex-1 border border-blue-500 text-blue-500 py-2 text-[9px] font-bold hover:bg-blue-500/10 uppercase transition-all">📄 Download Invoice</button>
                            <button onClick={() => generateStyledPDF(viewDetailsModal.device, 'statement')} className="flex-1 border border-blue-500 text-blue-500 py-2 text-[9px] font-bold hover:bg-blue-500/10 uppercase transition-all">📊 Download Statement</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🚀 RECEIVE EMI POPUP */}
            {showReceiveEmiModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-[#0A1128] border border-blue-500/50 p-6 rounded-xl w-full max-sm shadow-2xl font-mono uppercase">
                        <h3 className="text-blue-500 font-black text-center mb-6 tracking-widest uppercase">Receive EMI</h3>
                        <label className="text-[8px] text-gray-500 mb-1 block tracking-widest">Select Month</label>
                        <select className="bg-[#050A15] border border-[#273A60] w-full p-3 text-xs mb-4 outline-none text-white" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                            {generateEmiSchedule(viewDetailsModal.device).map(s => <option key={s.month} value={s.month}>EMI Month {s.month}</option>)}
                        </select>
                        <label className="text-[8px] text-gray-500 mb-1 block tracking-widest">Enter Amount (৳)</label>
                        <input type="number" className="bg-[#050A15] border border-[#273A60] w-full p-3 text-xs mb-6 outline-none text-white font-bold" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" />
                        <div className="flex gap-2">
                            <button onClick={() => setShowReceiveEmiModal(false)} className="flex-1 bg-gray-800 py-3 rounded text-[9px] font-black">CANCEL</button>
                            <button onClick={triggerReceivePayment} className="flex-1 bg-green-600 py-3 rounded text-[9px] font-black uppercase">Submit</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🚀 EMI EXTENSION POPUP */}
            {showExtensionModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-[#0A1128] border border-orange-500/50 p-6 rounded-xl w-full max-w-sm shadow-2xl font-mono uppercase">
                        <h3 className="text-orange-500 font-black text-center mb-6 tracking-widest uppercase">EMI Extension</h3>
                        <label className="text-[8px] text-gray-500 mb-1 block tracking-widest">Select Month</label>
                        <select className="bg-[#050A15] border border-[#273A60] w-full p-3 text-xs mb-4 outline-none text-white" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                            {generateEmiSchedule(viewDetailsModal.device).map(s => <option key={s.month} value={s.month}>EMI Month {s.month}</option>)}
                        </select>
                        <label className="text-[8px] text-gray-500 mb-1 block tracking-widest">New Date</label>
                        <input type="date" className="bg-[#050A15] border border-[#273A60] w-full p-3 text-xs mb-6 outline-none text-white font-bold uppercase" value={extensionDate} onChange={(e) => setExtensionDate(e.target.value)} />
                        <div className="flex gap-2">
                            <button onClick={() => setShowExtensionModal(false)} className="flex-1 bg-gray-800 py-3 rounded text-[9px] font-black">CANCEL</button>
                            <button onClick={handleExtension} className="flex-1 bg-blue-600 py-3 rounded text-[9px] font-black uppercase">Okay</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🚀 CONFIRMATION POPUP */}
            {confirmationPopup.isOpen && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100]">
                    <div className="bg-[#050A15] border border-white/10 p-8 rounded-lg max-w-sm w-full text-center shadow-2xl font-mono uppercase">
                        <div className="text-yellow-500 text-2xl mb-4">⚠️</div>
                        <p className="text-gray-300 text-xs mb-8 uppercase leading-relaxed font-bold tracking-widest">{confirmationPopup.message}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmationPopup({ isOpen: false })} className="flex-1 bg-red-900/30 text-red-500 py-3 rounded text-[10px] font-black tracking-widest">DENY</button>
                            <button onClick={() => { confirmationPopup.onConfirm(); setConfirmationPopup({ isOpen: false }); }} className="flex-1 bg-green-600 text-white py-3 rounded text-[10px] font-black tracking-widest">ACCEPT YES</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🚀 OTP DISPLAY POPUP */}
            {otpModal.isOpen && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[110]">
                    <div className="bg-[#0A1128] border border-green-500 p-10 rounded-xl text-center max-w-sm w-full shadow-[0_0_50px_rgba(34,197,94,0.2)] font-mono uppercase">
                        <div className="text-green-500 text-[9px] font-black mb-2 tracking-[0.3em] uppercase">Bypass Code</div>
                        <div className="text-5xl font-black text-white mb-6 tracking-[0.3em] select-all">{otpModal.otp}</div>
                        <p className="text-[8px] text-gray-500 mb-8 uppercase leading-relaxed tracking-wider">Share this code with user if device is locked without internet.</p>
                        <button onClick={() => setOtpModal({isOpen: false, otp: ''})} className="bg-green-600 text-white px-10 py-3 rounded text-[10px] font-black uppercase tracking-widest hover:bg-green-500 transition-all">ACKNOWLEDGE & CLOSE</button>
                    </div>
                </div>
            )}

            {/* 2. NEW SALE REGISTRATION MODAL */}
            {showRegModal && (
                <div className="fixed inset-0 bg-[#050A15]/95 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-[#0A1128] border border-blue-500/30 rounded-xl w-full max-w-3xl p-8 shadow-2xl my-10">
                        <div className="flex justify-between items-center mb-6 border-b border-[#273A60] pb-4">
                            <h3 className="text-xl font-black text-blue-500 uppercase tracking-widest">🛒 Authorize New Installment Sale</h3>
                            <button onClick={() => setShowRegModal(false)} className="text-gray-500 hover:text-red-500 font-black text-xl">✕</button>
                        </div>
                        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Customer Full Name *" required className="bg-[#050A15] border border-[#273A60] p-3 rounded text-white text-xs outline-none focus:border-blue-500" value={regForm.customer_name} onChange={(e) => setRegForm({...regForm, customer_name: e.target.value})} />
                            <input type="text" placeholder="Phone Number *" required className="bg-[#050A15] border border-[#273A60] p-3 rounded text-white text-xs outline-none focus:border-blue-500" value={regForm.customer_phone} onChange={(e) => setRegForm({...regForm, customer_phone: e.target.value})} />
                            <input type="text" placeholder="Father's Name" className="bg-[#050A15] border border-[#273A60] p-3 rounded text-white text-xs outline-none focus:border-blue-500" value={regForm.father_name} onChange={(e) => setRegForm({...regForm, father_name: e.target.value})} />
                            <input type="text" placeholder="Mother's Name" className="bg-[#050A15] border border-[#273A60] p-3 rounded text-white text-xs outline-none focus:border-blue-500" value={regForm.mother_name} onChange={(e) => setRegForm({...regForm, mother_name: e.target.value})} />
                            <textarea placeholder="Present Address" className="bg-[#050A15] border border-[#273A60] p-3 rounded h-16 text-white text-xs outline-none focus:border-blue-500" value={regForm.present_address} onChange={(e) => setRegForm({...regForm, present_address: e.target.value})} />
                            <textarea placeholder="Permanent Address" className="bg-[#050A15] border border-[#273A60] p-3 rounded h-16 text-white text-xs outline-none focus:border-blue-500" value={regForm.permanent_address} onChange={(e) => setRegForm({...regForm, permanent_address: e.target.value})} />
                            <input type="text" placeholder="Product Model" className="bg-[#050A15] border border-[#273A60] p-3 rounded text-white text-xs outline-none focus:border-blue-500" value={regForm.product_model} onChange={(e) => setRegForm({...regForm, product_model: e.target.value})} />
                            <input type="text" placeholder="Primary IMEI *" required className="bg-[#050A15] border border-[#273A60] p-3 rounded text-white text-xs outline-none focus:border-blue-500" value={regForm.imei} onChange={(e) => setRegForm({...regForm, imei: e.target.value})} />
                            <input type="number" placeholder="Total Price (৳) *" required className="bg-[#050A15] border border-[#273A60] p-3 rounded text-white text-xs outline-none focus:border-blue-500" value={regForm.total_price} onChange={(e) => setRegForm({...regForm, total_price: e.target.value})} />
                            <input type="number" placeholder="Down Payment (৳) *" required className="bg-[#050A15] border border-[#273A60] p-3 rounded text-white text-xs outline-none focus:border-blue-500" value={regForm.down_payment} onChange={(e) => setRegForm({...regForm, down_payment: e.target.value})} />

                            <div className="flex flex-col bg-[#050A15] border border-[#273A60] rounded p-1">
                                <label className="text-[8px] text-gray-500 uppercase ml-2 pt-1 font-bold">Installment Plan (Months)</label>
                                <select className="bg-transparent text-white text-xs p-2 outline-none" value={regForm.installment_months} onChange={(e) => setRegForm({...regForm, installment_months: e.target.value})}>
                                    {[1, 2, 3, 4, 6, 12, 18, 24].map(m => <option key={m} value={m} className="bg-[#0A1128]">{m} Months</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col bg-[#050A15] border border-[#273A60] rounded p-1">
                                <label className="text-[8px] text-gray-500 uppercase ml-2 pt-1 font-bold">EMI Start Date</label>
                                <input type="date" className="bg-transparent text-white text-xs p-2 outline-none uppercase font-bold" value={regForm.emi_start_date} onChange={(e) => setRegForm({...regForm, emi_start_date: e.target.value})} />
                            </div>

                            <button type="submit" className="md:col-span-2 mt-4 bg-blue-600 py-4 font-black uppercase tracking-widest text-white rounded shadow-lg hover:bg-blue-500 transition-all">GENERATE LICENSE & REGISTER DEVICE</button>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. SYSTEM NOTIFICATION MODAL */}
            {noticeModal.isOpen && (
                <div className="fixed inset-0 bg-[#050A15]/80 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-[#0A1128] border border-blue-500/50 rounded-lg p-6 max-w-sm w-full text-center shadow-2xl">
                        <h3 className="text-blue-500 font-black tracking-widest mb-2 uppercase">{noticeModal.title}</h3>
                        <p className="text-gray-300 text-xs mb-6 uppercase tracking-wider">{noticeModal.message}</p>
                        <button onClick={() => setNoticeModal({isOpen: false})} className="bg-blue-600 text-white px-8 py-2 rounded text-[10px] font-black tracking-widest hover:bg-blue-500 transition-colors">ACKNOWLEDGE</button>
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

            {/* 🚀 NEW: INSTALL APP QR MODAL */}
            {showInstallModal && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[500]">
                    <div className="bg-[#111A35] border border-[#273A60] rounded-xl p-8 max-w-2xl w-full shadow-2xl relative uppercase font-bold text-center">
                        <button onClick={() => setShowInstallModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-2xl font-black">✕</button>
                        <h3 className="text-xl font-black uppercase text-green-400 mb-8 border-b border-[#273A60] pb-4 tracking-widest">SCAN TO INSTALL PROTECTOR APP</h3>

                        <div className="flex flex-wrap justify-center gap-12">

                            {(!systemConfig.active_qr || systemConfig.active_qr === '1' || systemConfig.active_qr === 'BOTH') && systemConfig.qr1_image && (
                                <div className="flex flex-col items-center bg-[#0A1128] p-6 rounded-xl border border-blue-500/30 shadow-lg shadow-blue-900/20">
                                    <p className="text-blue-400 mb-4 text-[10px] font-black tracking-widest">SERVER 1 INSTALLER</p>
                                    <img src={systemConfig.qr1_image} alt="QR1" className="w-56 h-56 object-contain bg-white p-3 rounded-lg" />
                                </div>
                            )}

                            {(systemConfig.active_qr === '2' || systemConfig.active_qr === 'BOTH') && systemConfig.qr2_image && (
                                <div className="flex flex-col items-center bg-[#0A1128] p-6 rounded-xl border border-purple-500/30 shadow-lg shadow-purple-900/20">
                                    <p className="text-purple-400 mb-4 text-[10px] font-black tracking-widest">SERVER 2 INSTALLER</p>
                                    <img src={systemConfig.qr2_image} alt="QR2" className="w-56 h-56 object-contain bg-white p-3 rounded-lg" />
                                </div>
                            )}

                            {!systemConfig.qr1_image && !systemConfig.qr2_image && (
                                <div className="p-8 text-center text-gray-500 tracking-[0.2em] italic w-full border border-dashed border-[#273A60] rounded">
                                    SYSTEM ADMIN HAS NOT CONFIGURED QR INSTALLERS YET.
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ShopkeeperDashboard;