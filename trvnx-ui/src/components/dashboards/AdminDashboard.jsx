import React, { useState, useEffect, useRef } from 'react';
import { BD_DATA } from '../../utils/bd_geo.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import MultiSelectDropdown from "./admin/MultiSelectDropdown.jsx";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import HomeDashboard from './HomeDashboard.jsx';
import LicenseFee from './LicenseFee.jsx';

import Sidebar from './Sidebar.jsx';
import ShopList from './ShopList.jsx';
import RechargeTerminal from './RechargeTerminal.jsx';
import CreateOperator from './CreateOperator.jsx';
import Finance from './Finance.jsx';
import DistributorSR from './DistributorSR.jsx';
import ActivityLog from './ActivityLog.jsx';

// 🚀 IMPORT THE NEW MARKETING COMPONENT
import Marketing from './Marketing.jsx';

const AdminDashboard = ({ user, onLogout }) => {
    // State Matrix
    const [users, setUsers] = useState([]);
    const [pendingTx, setPendingTx] = useState([]);
    const [activeSlip, setActiveSlip] = useState(null);
    const [feeOverride, setFeeOverride] = useState({});
    const [showRechargeModal, setShowRechargeModal] = useState(false);
    const [activityLogs, setActivityLogs] = useState([]);

    // 🚀 NEW: Lindux User Menu States & Data
    const [isLinduxUserMenuOpen, setIsLinduxUserMenuOpen] = useState(false);
    const [linduxUserForm, setLinduxUserForm] = useState({
        name: '', password: '', fatherName: '', motherName: '',
        phone1: '', phone2: '', address1: '', address2: '',
        division: '', district: '', thana: '', role: 'ADMIN', permissions: []
    });

    // 🚀 ALL SYSTEM MODULES FOR PERMISSION CHECKLIST
    const ALL_PERMISSIONS = ['HOME', 'FINANCE_INCOME', 'FINANCE_EXPENSE', 'BALANCE_SHEET', 'CASH_BOOK', 'UNUSED_BALANCE', 'RECHARGE', 'DISTRIBUTOR_PAYOUTS', 'ALL_DEVICES', 'DISTRIBUTOR_SR', 'MARKETING', 'SHOP', 'LICENSE_FEE', 'PAYMENT_GATEWAY', 'QR_CODE', 'ACTIVITY_LOGS'];

    const togglePermission = (perm) => {
        setLinduxUserForm(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm) ? prev.permissions.filter(p => p !== perm) : [...prev.permissions, perm]
        }));
    };

    // 🚀 NEW: Password States
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });

    // 🚀 NEW: QR Code Modal State & Handlers
    const [showQrModal, setShowQrModal] = useState(false);

    const handleQrUpload = (e, qrNum) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSystemConfig(prev => ({ ...prev, [`qr${qrNum}_image`]: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    // 🚀 NEW: Secure Action Modal for Track & Uninstall
    const [secureActionModal, setSecureActionModal] = useState({ isOpen: false, device: null, actionType: '', step: 1, reason: 'Due to Customer Request', customReason: '', password: '' });

    // All Devices View States
    const [allDevices, setAllDevices] = useState([]);
    const [deviceSearchTerm, setDeviceSearchTerm] = useState('');
    const [deviceFilter, setDeviceFilter] = useState('ACTIVE');
    const [currentDevicePage, setCurrentDevicePage] = useState(1);
    const DEVICES_PER_PAGE = 50;

    // Shop Tab States
    const [shopSearchTerm, setShopSearchTerm] = useState('');
    const [currentShopPage, setCurrentShopPage] = useState(1);
    const [viewShopModal, setViewShopModal] = useState({ isOpen: false, shop: null });
    const SHOPS_PER_PAGE = 50;

    // Commission Tab States
    const [commissionList, setCommissionList] = useState([]);
    const [commStartDate, setCommStartDate] = useState('');
    const [commEndDate, setCommEndDate] = useState('');
    const [viewCommModal, setViewCommModal] = useState({ isOpen: false, dist: null, details: [] });

    // Finance Terminal States
    const [financeLedger, setFinanceLedger] = useState([]);
    const [financeStartDate, setFinanceStartDate] = useState('');
    const [financeEndDate, setFinanceEndDate] = useState('');
    const [financeSearchTerm, setFinanceSearchTerm] = useState('');

    const [financeFormModal, setFinanceFormModal] = useState({
        isOpen: false,
        type: 'INCOME',
        date: new Date().toISOString().split('T')[0],
        name: '', description: '', amount: '', remarks: ''
    });

    // Unused Balance & Recharge States
    const [unusedBalanceList, setUnusedBalanceList] = useState([]);
    const [unusedStartDate, setUnusedStartDate] = useState('');
    const [unusedEndDate, setUnusedEndDate] = useState('');
    const [viewUnusedModal, setViewUnusedModal] = useState({ isOpen: false, shop: null, history: [] });

    const [rechargeForm, setRechargeForm] = useState({
        date: new Date().toISOString().split('T')[0],
        shopId: '', shopName: '', shopOwner: '', phone: '',
        amount: '', method: 'Cash', otherDetails: ''
    });

    // Search States for Recharge Dropdown
    const [rechargeSearchQuery, setRechargeSearchQuery] = useState('');
    const [isRechargeSearchOpen, setIsRechargeSearchOpen] = useState(false);

    // System Settings
    const [systemConfig, setSystemConfig] = useState({
        base_license_price: 2000,
        promo_start: '', promo_end: '', promo_type: 'NONE', promo_value: 0,
        promo_comm_start: '', promo_comm_end: '', promo_comm_type: 'NONE', promo_comm_value: 0,
        bkash_api: false, nagad_api: false,
        bkash_merchant: false, bkash_merchant_number: '',
        nagad_merchant: false, nagad_merchant_number: '',
        bkash_personal: false, bkash_personal_number: '',
        nagad_personal: false, nagad_personal_number: ''
    });

    // Modals & Forms
    const [rechargeData, setRechargeData] = useState({ userId: null, userName: '', amount: '' });
    const [activeTab, setActiveTab] = useState(user.role === 'ACCOUNTS' ? 'finance_income' : 'home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDistMenuOpen, setIsDistMenuOpen] = useState(false);
    const [isLicenseMenuOpen, setIsLicenseMenuOpen] = useState(false);
    const [isFinanceMenuOpen, setIsFinanceMenuOpen] = useState(false);
    const [isMarketingMenuOpen, setIsMarketingMenuOpen] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [shopApproveModal, setShopApproveModal] = useState({ isOpen: false, shop: null });

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
                fetchData('auth/operators', setUsers); // Refresh matrix
            } else {
                const errorData = await res.json();
                if (errorData.message === 'TOKEN_EXPIRED_OR_INVALID' || res.status === 401) {
                    alert("❌ SESSION EXPIRED. Please log in again.");
                    onLogout();
                } else {
                    alert(`❌ ACTION FAILED: ${errorData.message || res.statusText}`);
                }
                console.error("BACKEND REJECTION DETAILS:", errorData);
            }
        } catch (err) { alert("⚠️ SYSTEM OFFLINE."); }
    };

    // 🚀 NEW: Create Lindux User Function
    const handleCreateLinduxUser = async (e) => {
        e.preventDefault();
        const payload = {
            name: linduxUserForm.name, phone: linduxUserForm.phone1, phone_alt: linduxUserForm.phone2,
            password: linduxUserForm.password, father_name: linduxUserForm.fatherName, mother_name: linduxUserForm.motherName,
            role: linduxUserForm.role, permissions: linduxUserForm.permissions, createdBy: user.id || user._id,
            address: { line1: linduxUserForm.address1, line2: linduxUserForm.address2, division: linduxUserForm.division, district: linduxUserForm.district, thana: linduxUserForm.thana }
        };
        try {
            const res = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("✅ LINDUX USER CREATED.");
                setLinduxUserForm({ name: '', password: '', fatherName: '', motherName: '', phone1: '', phone2: '', address1: '', address2: '', division: '', district: '', thana: '', role: 'ADMIN', permissions: [] });
                fetchData('auth/operators', setUsers);
                setActiveTab('lindux_user_list');
            } else { alert("❌ CREATION FAILED."); }
        } catch (err) { alert("⚠️ SYSTEM OFFLINE."); }
    };

    // 🚀 FIXED: Mirror Protocol Function added here so Lindux Users can be mirrored
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

    // 🚀 NEW: Password Function
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

    // 🚀 ADDED: Handle Track Function
    const handleTrack = async (device, reason = "Admin Action") => {
        try {
            const res = await fetch(`http://localhost:5000/api/devices/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify({ deviceId: device._id, reason })
            });
            if (res.ok) alert("✅ Tracking signal sent successfully.");
            else alert("❌ Failed to send tracking signal.");
        } catch (err) { alert("⚠️ SYSTEM OFFLINE."); }
    };

    const triggerDeviceUninstall = async (device) => {
        if (!window.confirm(`WARNING: Master override to permanently release device ${device._id}?`)) return;
        await fetch(`http://localhost:5000/api/devices/uninstall`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
            body: JSON.stringify({ deviceId: device._id })
        });
        fetchData('devices/all', setAllDevices);
    };

    // 🚀 NEW: Execute Secure Multi-Step Action (Track or Uninstall)
    const executeSecureAction = async (e) => {
        e.preventDefault();
        const { device, actionType, reason, customReason, password } = secureActionModal;
        const finalReason = reason === 'Other' ? customReason : reason;

        try {
            let endpoint = '';
            let payload = { deviceId: device._id, reason: finalReason, adminPassword: password };

            if (actionType === 'TRACK') {
                endpoint = 'http://localhost:5000/api/devices/track';
            } else if (actionType === 'UNINSTALL') {
                endpoint = 'http://localhost:5000/api/devices/uninstall';
            }

            const res = await fetch(endpoint, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(`✅ ${actionType} ACTION SUCCESSFUL.`);
                setSecureActionModal({ isOpen: false, device: null, actionType: '', step: 1, reason: 'Due to Customer Request', customReason: '', password: '' });
                fetchData('devices/all', setAllDevices);
            } else {
                const err = await res.json();
                alert(`❌ FAILED: ${err.message || 'Incorrect Password'}`);
            }
        } catch (err) { alert("⚠️ SYSTEM OFFLINE."); }
    };

    // 🚀 BULLETPROOF MARKETING STATES
    const [marketingTargets, setMarketingTargets] = useState([]);
    const [targetForm, setTargetForm] = useState({
        name: '', startDate: '', endDate: '', districts: [], thanas: [], idTarget: '', licenseTarget: '', bonus: ''
    });
    const [editTargetModal, setEditTargetModal] = useState({ isOpen: false, target: null });

    const allBDDistricts = BD_DATA ? Object.values(BD_DATA).reduce((acc, div) => acc.concat(Object.keys(div)), []).sort() : [];

    const targetAvailableThanas = (Array.isArray(targetForm.districts) && targetForm.districts.length > 0 && BD_DATA)
        ? targetForm.districts.reduce((acc, dist) => {
            for (const div in BD_DATA) { if (BD_DATA[div][dist]) return acc.concat(BD_DATA[div][dist]); }
            return acc;
        }, []).sort() : [];

    const editTargetAvailableThanas = (editTargetModal.target && Array.isArray(editTargetModal.target.districts) && editTargetModal.target.districts.length > 0 && BD_DATA)
        ? editTargetModal.target.districts.reduce((acc, dist) => {
            for (const div in BD_DATA) { if (BD_DATA[div][dist]) return acc.concat(BD_DATA[div][dist]); }
            return acc;
        }, []).sort() : [];

    const handleCreateTarget = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...targetForm,
                target_name: targetForm.name,
                name: targetForm.name,
                start_date: targetForm.startDate,
                startDate: targetForm.startDate,
                end_date: targetForm.endDate,
                endDate: targetForm.endDate,
                id_target: Number(targetForm.idTarget) || 0,
                target_amount: Number(targetForm.idTarget) || 0,
                idTarget: Number(targetForm.idTarget) || 0,
                license_target: Number(targetForm.licenseTarget) || 0,
                licenseTarget: Number(targetForm.licenseTarget) || 0,
                bonus_amount: Number(targetForm.bonus) || 0,
                bonus: Number(targetForm.bonus) || 0
            };
            const res = await fetch('http://localhost:5000/api/marketing/create-target', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("✅ MARKETING TARGET DEPLOYED.");
                setTargetForm({ name: '', startDate: '', endDate: '', districts: [], thanas: [], idTarget: '', licenseTarget: '', bonus: '' });
                fetchData('marketing/targets', setMarketingTargets);
            }
        } catch (err) { console.error(err); }
    };

    const handleUpdateTarget = async (e) => {
        e.preventDefault();
        try {
            const t = editTargetModal.target;
            const updatePayload = {
                ...t,
                target_name: t.target_name || t.name,
                id_target: Number(t.id_target || t.idTarget || t.target_amount || 0),
                target_amount: Number(t.id_target || t.idTarget || t.target_amount || 0),
                license_target: Number(t.license_target || t.licenseTarget || 0),
                bonus_amount: Number(t.bonus_amount || t.bonus || 0)
            };
            const targetUrl = `http://localhost:5000/api/marketing/update-target`;
            const res = await fetch(targetUrl, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify(updatePayload)
            });
            if (res.ok) {
                alert("✅ TARGET UPDATED SUCCESSFULLY.");
                setEditTargetModal({ isOpen: false, target: null });
                fetchData('marketing/targets', setMarketingTargets);
            } else {
                const fallbackRes = await fetch(`http://localhost:5000/api/marketing/targets/${t._id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                    body: JSON.stringify(updatePayload)
                });
                if (fallbackRes.ok) {
                    alert("✅ TARGET UPDATED SUCCESSFULLY.");
                    setEditTargetModal({ isOpen: false, target: null });
                    fetchData('marketing/targets', setMarketingTargets);
                }
            }
        } catch (err) { console.error(err); alert("⚠️ SYSTEM OFFLINE."); }
    };

    const [targetSearchTerm, setTargetSearchTerm] = useState('');
    const [targetFilterName, setTargetFilterName] = useState('');
    const [targetFilterStart, setTargetFilterStart] = useState('');
    const [targetFilterEnd, setTargetFilterEnd] = useState('');
    const [currentTargetPage, setCurrentTargetPage] = useState(1);
    const TARGETS_PER_PAGE = 50;

    const [viewDistModal, setViewDistModal] = useState({ isOpen: false, dist: null });
    const [distFormData, setDistFormData] = useState({
        fullName: '', businessName: '', fatherName: '', motherName: '',
        address1: '', address2: '', division: '', district: '', thana: '',
        phone1: '', phone2: '', password: '',
        marketDistricts: [], marketThanas: [], marketName: '',
        commPerUser: '', commPerLicense: '', role: 'DISTRIBUTOR'
    });

    const [viewDetailsModal, setViewDetailsModal] = useState({ isOpen: false, device: null });
    const [formData, setFormData] = useState({ name: '', phone: '', role: 'SHOPKEEPER', homeDivision: '', homeDistrict: '', homeThana: '', password: '', managedDivisions: [], managedDistricts: [], managedThanas: [] });

    const fetchData = async (endpoint, setter) => {
        try {
            const res = await fetch(`http://localhost:5000/api/${endpoint}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` } });

            if (res.status === 401 || res.status === 403) {
                console.error(`[401 UNAUTHORIZED] Token Expired for endpoint: ${endpoint}`);
                return;
            }

            const data = await res.json();

            if (endpoint === 'devices/all') setter(data.devices || data.data || data || []);
            else if (endpoint === 'auth/operators') setter(Array.isArray(data) ? data : (data.users || data.data || []));
            else if (['admin/commissions', 'admin/finance-ledger', 'admin/unused-balance', 'marketing/targets'].includes(endpoint)) {
                let listArray = [];
                if (Array.isArray(data)) listArray = data;
                else if (data?.targets && Array.isArray(data.targets)) listArray = data.targets;
                else if (data?.data && Array.isArray(data.data)) listArray = data.data;
                else if (data?.data?.targets && Array.isArray(data.data.targets)) listArray = data.data.targets;
                else if (data?.payload && Array.isArray(data.payload)) listArray = data.payload;
                else if (data && typeof data === 'object') {
                    const foundArray = Object.values(data).find(val => Array.isArray(val));
                    listArray = foundArray || Object.values(data).filter(item => typeof item === 'object' && item._id);
                }
                setter(listArray || []);
            } else if (data) setter(prev => ({ ...prev, ...data }));
        } catch (error) { console.error("Fetch Error:", error); }
    };

    useEffect(() => {
        if (['dist_details', 'sr_details', 'shop_list', 'finance_recharge', 'sr_ac', 'marketing_create', 'home', 'lindux_user_list'].includes(activeTab) || activeTab.startsWith('license_')) {
            fetchData('auth/operators', setUsers);
        }

        if (['marketing_targets', 'marketing_achievements', 'home'].includes(activeTab)) {
            fetchData('marketing/targets', setMarketingTargets);
        }

        if (activeTab === 'finance') fetchData('transactions/pending', setPendingTx);

        if (activeTab === 'settings' || activeTab === 'gateways') fetchData('settings', setSystemConfig);

        if (activeTab === 'dist_ac') fetchData('admin/commissions', setCommissionList);

        if (['finance_income', 'finance_expense', 'finance_balance', 'finance_payouts', 'sr_ac', 'finance_cashbook', 'finance_entry_income', 'finance_entry_expense', 'home'].includes(activeTab)) {
            fetchData('admin/finance-ledger', setFinanceLedger);
        }

        if (activeTab === 'finance_unused') fetchData('admin/unused-balance', setUnusedBalanceList);

        if (activeTab === 'all_devices' || activeTab === 'home') {
            fetchData('devices/all', setAllDevices);
        }
        if (activeTab === 'activity_logs') {
            fetchData('admin/audit-logs', setActivityLogs);
        }
    }, [activeTab]);

    // 🚀 NEW: Automatic Polling Sync Logic
    useEffect(() => {
        // Only run polling loop if we are on the devices tab
        if (activeTab === 'all_devices') {
            // Re-fetch the data from the backend matrix every 60 seconds
            const syncInterval = setInterval(() => {
                fetchData('devices/all', setAllDevices);
            }, 60000); // Poll every 60,000ms

            // Cleanup function is critical: Clears interval when user closes tab
            return () => clearInterval(syncInterval);
        }
    }, [activeTab]);

    useEffect(() => {
        if (rechargeForm.shopId.length >= 24) {
            const validUsers = Array.isArray(users) ? users : [];
            const foundShop = validUsers.find(u => u._id === rechargeForm.shopId && u.role === 'SHOPKEEPER');
            if (foundShop) setRechargeForm(prev => ({ ...prev, shopName: foundShop.business_name || 'N/A', shopOwner: foundShop.name, phone: foundShop.phone }));
        } else {
            setRechargeForm(prev => ({...prev, shopName: '', shopOwner: '', phone: ''}));
        }
    }, [rechargeForm.shopId, users]);

    const handleManualRecharge = async (e) => {
        e.preventDefault();
        const res = await fetch('http://localhost:5000/api/transactions/manual-recharge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
            body: JSON.stringify({ userId: rechargeData.userId, amount: rechargeData.amount })
        });
        if (res.ok) { setShowRechargeModal(false); fetchData('auth/operators', setUsers); alert("Wallet Adjusted Successfully."); }
    };

    const handleUpdateSettings = async (e) => {
        e.preventDefault();
        const res = await fetch('http://localhost:5000/api/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
            body: JSON.stringify(systemConfig)
        });
        if (res.ok) alert("✅ SYSTEM_SYNC: Global matrix updated.");
    };

    const handleFinanceSubmit = async (e, forceType) => {
        e.preventDefault();
        try {
            const entryType = forceType || (financeFormModal.type === 'INCOME' ? 'MANUAL_INCOME' : 'MANUAL_EXPENSE');
            const payload = {
                type: entryType,
                name: financeFormModal.name, description: financeFormModal.description,
                amount: Number(financeFormModal.amount), remarks: financeFormModal.remarks, date: financeFormModal.date
            };
            const res = await fetch('http://localhost:5000/api/admin/finance-entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setFinanceFormModal({ isOpen: false, type: 'INCOME', date: new Date().toISOString().split('T')[0], name: '', description: '', amount: '', remarks: '' });
                fetchData('admin/finance-ledger', setFinanceLedger);
                alert(`✅ ${entryType} GENERATED.`);
            } else alert("Failed to save entry.");
        } catch (error) { console.error(error); }
    };

    const handleShopRechargeSubmit = async (e) => {
        e.preventDefault();
        if (!rechargeForm.shopName) return alert("Invalid Shop ID. Wait for auto-fill.");
        try {
            const payload = {
                shopId: rechargeForm.shopId, amount: Number(rechargeForm.amount), paymentMethod: rechargeForm.method,
                otherDetails: rechargeForm.otherDetails, date: rechargeForm.date
            };
            const res = await fetch('http://localhost:5000/api/admin/shop-recharge', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                alert("✅ RECHARGE SUCCESSFUL. INVOICE GENERATED IN BACKEND...");
                setRechargeForm({ date: new Date().toISOString().split('T')[0], shopId: '', shopName: '', shopOwner: '', phone: '', amount: '', method: 'Cash', otherDetails: '' });
                setRechargeSearchQuery('');
                fetchData('auth/operators', setUsers);
            } else alert("Failed to execute recharge.");
        } catch (err) { console.error(err); }
    };

    const handleApprovePayout = async (txId) => {
        try {
            const res = await fetch('http://localhost:5000/api/transactions/approve-payout', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify({ transactionId: txId })
            });
            if (res.ok) { alert("✅ PAYOUT APPROVED. Sent to Accounts Queue."); fetchData('admin/finance-ledger', setFinanceLedger); }
        } catch (err) { console.error(err); }
    };

    const handleReleasePayout = async (txId) => {
        try {
            const res = await fetch('http://localhost:5000/api/transactions/release-payout', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify({ transactionId: txId })
            });
            if (res.ok) {
                const data = await res.json();
                alert(`✅ FUNDS RELEASED. Digital Slip Generated: ${data.slip?.id}`);
                fetchData('admin/finance-ledger', setFinanceLedger);
            }
        } catch (err) { console.error(err); }
    };

    const handleCreateDistributor = async (e) => {
        e.preventDefault();
        const payload = {
            name: distFormData.fullName, phone: distFormData.phone1, password: distFormData.password, role: distFormData.role,
            business_name: distFormData.businessName, father_name: distFormData.fatherName, mother_name: distFormData.motherName,
            address: { line1: distFormData.address1, line2: distFormData.address2, division: distFormData.division, district: distFormData.district, thana: distFormData.thana },
            phone_alt: distFormData.phone2, market_area: { districts: distFormData.marketDistricts, thanas: distFormData.marketThanas, market_name: distFormData.marketName },
            commissions: { per_user: Number(distFormData.commPerUser), per_license: Number(distFormData.commPerLicense) },
            createdBy: user.id || user._id, territory: { division: distFormData.division, district: distFormData.district, police_station: distFormData.thana, managed_districts: distFormData.marketDistricts, managed_thanas: distFormData.marketThanas }
        };
        try {
            const res = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                alert("✅ DISTRIBUTOR/SR CREATED SUCCESSFULLY.");
                await fetchData('auth/operators', setUsers);
                setActiveTab('dist_details');
                setDistFormData({ fullName: '', businessName: '', fatherName: '', motherName: '', address1: '', address2: '', division: '', district: '', thana: '', phone1: '', phone2: '', password: '', marketDistricts: [], marketThanas: [], marketName: '', commPerUser: '', commPerLicense: '', role: 'DISTRIBUTOR' });
            } else alert(`CREATION FAILED: ${data.message || 'Unknown Server Error'}`);
        } catch (error) { alert("CREATION FAILED: Backend server is offline or unreachable."); }
    };

    const toggleUserLock = async (userId, currentStatus) => {
        const res = await fetch(`http://localhost:5000/api/auth/toggle-status`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
            body: JSON.stringify({ userId, status: currentStatus === 'ACTIVE' ? 'LOCKED' : 'ACTIVE' })
        });
        if (res.ok) fetchData('auth/operators', setUsers);
    };

    const handleDeviceAction = async (deviceId, action, reason = "Super Admin Request") => {
        await fetch(`http://localhost:5000/api/devices/toggle-lock`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('trvnx_token')}` },
            body: JSON.stringify({ deviceId, action, reason })
        });
        fetchData('devices/all', setAllDevices);
    };

    const getTrueEmi = (device) => {
        if (!device) return 0;
        return Math.round(((Number(device.total_price) || 0) - (Number(device.down_payment) || 0)) / (Number(device.installment_months) || 1));
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
            if (remainingPaid >= expectedAmount) { status = "PAID"; color = "text-green-500"; remainingPaid -= expectedAmount; }
            else if (remainingPaid > 0) { status = `PARTIAL (৳${remainingPaid})`; color = "text-yellow-500"; remainingPaid = 0; }
            let displayDate = new Date(baseDate).toLocaleDateString();
            if (!firstDueFound && (status === "DUE" || status.startsWith("PARTIAL"))) {
                if (device.next_due_date) displayDate = new Date(device.next_due_date).toLocaleDateString();
                firstDueFound = true;
            }
            schedule.push({ month: i, date: displayDate, amount: expectedAmount, statusText: status, color: color });
        }
        return schedule;
    };

    const generateCommissionPDF = () => {
        if (!viewCommModal.dist || viewCommModal.details.length === 0) return alert("No detailed data to download");
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        doc.setFillColor(10, 17, 40); doc.rect(0, 0, 210, 40, 'F'); doc.setTextColor(33, 150, 243); doc.setFontSize(18);
        doc.text("LINDUX EMI COMMISSION STATEMENT", 15, 20); doc.setTextColor(255, 255, 255); doc.setFontSize(9);
        doc.text(`Distributor/SR: ${viewCommModal.dist.name} (${viewCommModal.dist.business_name || 'N/A'})`, 15, 28);
        doc.text(`ID: ${viewCommModal.dist._id}`, 15, 33);
        autoTable(doc, {
            startY: 45, head: [['No', 'Date', 'Shop ID', 'Shop Name', 'Description', 'Amount']],
            body: viewCommModal.details.map((item, index) => [index + 1, new Date(item.date || item.createdAt).toLocaleDateString(), item.shop_id || 'N/A', item.shop_name || 'N/A', item.description || 'Commission Entry', `BDT ${item.amount}`]),
            theme: 'grid', headStyles: { fillColor: [33, 150, 243] }
        });
        doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.text(`Generated automatically by Lindux EMI System Matrix`, 105, 280, { align: 'center' });
        doc.save(`${viewCommModal.dist.name}_Commission_Statement.pdf`);
    };

    const generateFinancePDF = (title, data) => {
        if (!data || data.length === 0) return alert("No data to download for the selected dates.");
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const isExpense = title.includes("Expense");
        doc.setFillColor(10, 17, 40); doc.rect(0, 0, 210, 40, 'F'); doc.setTextColor(isExpense ? 239 : 34, isExpense ? 68 : 197, isExpense ? 68 : 94);
        doc.setFontSize(18); doc.text(`LINDUX EMI ${title.toUpperCase()}`, 15, 20); doc.setTextColor(255, 255, 255); doc.setFontSize(9);
        doc.text(`Date Range: ${financeStartDate || 'All Time'} to ${financeEndDate || 'All Time'}`, 15, 30);
        autoTable(doc, {
            startY: 45, head: [['No', 'Date', 'ID No', 'Name', 'Description', 'Amount']],
            body: data.map((item, index) => [index + 1, new Date(item.createdAt).toLocaleDateString(), item.userId?._id?.slice(-6).toUpperCase() || 'SYS', item.userId?.name || 'ADMIN_ENTRY', item.description || item.type, `BDT ${item.amount}`]),
            theme: 'grid', headStyles: { fillColor: isExpense ? [239, 68, 68] : [34, 197, 94] }
        });
        const total = data.reduce((sum, item) => sum + Number(item.amount), 0);
        doc.setFontSize(12); doc.setTextColor(0, 0, 0); doc.text(`TOTAL ${isExpense ? 'EXPENSE' : 'INCOME'}: BDT ${total.toLocaleString()}`, 15, doc.lastAutoTable.finalY + 10);
        doc.save(`LINDUX_EMI_${title.replace(' ', '_')}.pdf`);
    };

    const generateRechargeInvoicePDF = (tx, shop) => {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a5' });
        doc.setFillColor(10, 17, 40); doc.rect(0, 0, 148, 30, 'F'); doc.setTextColor(34, 197, 94); doc.setFontSize(16);
        doc.text("LINDUX EMI RECHARGE INVOICE", 10, 15); doc.setTextColor(255, 255, 255); doc.setFontSize(8);
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

    const allDivisions = BD_DATA ? Object.keys(BD_DATA) : [];
    const currentDistricts = (distFormData.division && BD_DATA && BD_DATA[distFormData.division]) ? Object.keys(BD_DATA[distFormData.division]) : [];
    const currentThanas = (distFormData.district && BD_DATA && BD_DATA[distFormData.division] && BD_DATA[distFormData.division][distFormData.district]) ? BD_DATA[distFormData.division][distFormData.district] : [];
    const marketAreaThanas = distFormData.marketDistricts.length > 0 && BD_DATA ? Array.from(new Set(distFormData.marketDistricts.flatMap(d => (distFormData.division && BD_DATA[distFormData.division] && BD_DATA[distFormData.division][d]) ? BD_DATA[distFormData.division][d] : []))) : [];

    const linduxUserCurrentDistricts = (linduxUserForm.division && BD_DATA && BD_DATA[linduxUserForm.division]) ? Object.keys(BD_DATA[linduxUserForm.division]) : [];
    const linduxUserCurrentThanas = (linduxUserForm.district && BD_DATA && BD_DATA[linduxUserForm.division] && BD_DATA[linduxUserForm.division][linduxUserForm.district]) ? BD_DATA[linduxUserForm.division][linduxUserForm.district] : [];

    const canSeeFinance = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS'].includes(user.role);
    const canSeeRegistry = ['SUPER_ADMIN', 'ADMIN', 'MARKETING', 'CALL_CENTER'].includes(user.role);
    const canSeeSettings = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);

    // 🚀 NEW DEVICE FILTERING LOGIC
    const filteredDevices = allDevices.filter(d => {
        if (!d) return false;

        // 1. Search Check
        const searchStr = deviceSearchTerm.toLowerCase();
        const matchesSearch = d.customer_name?.toLowerCase().includes(searchStr) || d.customer_phone?.includes(searchStr);

        // 2. Status Check
        const isUninstalled = d.is_uninstalled === true || d.status === 'UNINSTALLED' || d.device_status === 'UNINSTALLED' || d.license_status === 'UNINSTALLED';
        const isLocked = d.is_locked === true;

        let matchesFilter = true;
        if (deviceFilter === 'ALL') matchesFilter = true; // 🚀 FIX: The new filter logic
        else if (deviceFilter === 'ACTIVE') matchesFilter = !isUninstalled;
        else if (deviceFilter === 'LOCKED') matchesFilter = !isUninstalled && isLocked;
        else if (deviceFilter === 'UNLOCKED') matchesFilter = !isUninstalled && !isLocked;
        else if (deviceFilter === 'UNINSTALLED') matchesFilter = isUninstalled;

        return matchesSearch && matchesFilter;
    });
    const totalDevicePages = Math.ceil(filteredDevices.length / DEVICES_PER_PAGE) || 1;
    const paginatedDevices = filteredDevices.slice((currentDevicePage - 1) * DEVICES_PER_PAGE, currentDevicePage * DEVICES_PER_PAGE);
    const validUsers = Array.isArray(users) ? users : [];
    const shopUsers = validUsers.filter(u => u && u.role === 'SHOPKEEPER');
    const totalNotifications = shopUsers.filter(s => ['WAITING_ADMIN', 'WAITING_DISTRIBUTOR'].includes(s.approval?.status)).length;

    const filteredRechargeShops = shopUsers.filter(u => {
        if (!rechargeSearchQuery) return true;
        const term = rechargeSearchQuery.toLowerCase();
        return (u.business_name?.toLowerCase().includes(term) || u.name?.toLowerCase().includes(term) || u.phone?.toLowerCase().includes(term) || u._id?.toLowerCase().includes(term));
    });

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const escalatedShops = shopUsers.filter(shop =>
        shop.approval?.status === 'WAITING_DISTRIBUTOR' &&
        new Date(shop.approval?.requested_at || shop.createdAt) < fortyEightHoursAgo
    );

    const filteredShops = shopUsers.filter(u => {
        if (!u) return false;
        const search = shopSearchTerm.toLowerCase();
        return (u.name?.toLowerCase().includes(search) || u.business_name?.toLowerCase().includes(search) || u.phone?.toLowerCase().includes(search) || u._id?.toLowerCase().includes(search));
    });
    const totalShopPages = Math.ceil(filteredShops.length / SHOPS_PER_PAGE) || 1;
    const paginatedShops = filteredShops.slice((currentShopPage - 1) * SHOPS_PER_PAGE, currentShopPage * SHOPS_PER_PAGE);

    const filteredCommissions = commissionList.filter(comm => {
        if (!comm) return false;
        if (!commStartDate && !commEndDate) return true;
        const commDate = new Date(comm.date || comm.createdAt).setHours(0,0,0,0);
        const start = commStartDate ? new Date(commStartDate).setHours(0,0,0,0) : null;
        const end = commEndDate ? new Date(commEndDate).setHours(23,59,59,999) : null;
        if (start && end) return commDate >= start && commDate <= end;
        if (start) return commDate >= start;
        if (end) return commDate <= end;
        return true;
    });

    // 🚀 FIX: Bulletproof Filtering for Old & New Database Records
    const filteredLedger = financeLedger.filter(tx => {
        if (!tx) return false;
        let match = true;
        if (financeSearchTerm) {
            const term = financeSearchTerm.toLowerCase();
            match = tx.description?.toLowerCase().includes(term) || tx.userId?.name?.toLowerCase().includes(term);
        }
        if (match && (financeStartDate || financeEndDate)) {
            const txDateStr = tx.createdAt || tx.date;
            if (!txDateStr) return true; // Safety against missing dates

            const txDate = new Date(txDateStr).setHours(0,0,0,0);
            const start = financeStartDate ? new Date(financeStartDate).setHours(0,0,0,0) : null;
            const end = financeEndDate ? new Date(financeEndDate).setHours(23,59,59,999) : null;
            if (start && end) return txDate >= start && txDate <= end;
            if (start) return txDate >= start;
            if (end) return txDate <= end;
        }
        return match;
    });

    // 🚀 FIX: Includes old types like 'INCOME' and 'EXPENSE'
    const incomeEntries = filteredLedger.filter(tx => tx && (['MANUAL_INCOME', 'RECHARGE', 'INCOME', 'LICENSE_ACTIVATION'].includes(tx.type)));
    const expenseEntries = filteredLedger.filter(tx => tx && (['MANUAL_EXPENSE', 'COMMISSION', 'SR_PAYOUT', 'EXPENSE'].includes(tx.type)));
    const totalIncome = incomeEntries.reduce((sum, item) => sum + Number(item?.amount || 0), 0);
    const totalExpense = expenseEntries.reduce((sum, item) => sum + Number(item?.amount || 0), 0);

    const filteredUnused = unusedBalanceList.filter(shop => {
        if (!shop) return false;
        if (!unusedStartDate && !unusedEndDate) return true;
        const hasTxInDate = (shop.history || []).some(tx => {
            if (!tx) return false;
            const txDateStr = tx.date || tx.createdAt;
            if (!txDateStr) return true;

            const txDate = new Date(txDateStr).setHours(0,0,0,0);
            const start = unusedStartDate ? new Date(unusedStartDate).setHours(0,0,0,0) : null;
            const end = unusedEndDate ? new Date(unusedEndDate).setHours(23,59,59,999) : null;
            if (start && end) return txDate >= start && txDate <= end;
            if (start) return txDate >= start;
            if (end) return txDate <= end;
            return false;
        });
        return hasTxInDate;
    });

    const totalUnusedLiability = filteredUnused.reduce((sum, shop) => sum + (Number(shop?.current_balance) || 0), 0);

    const distributorNames = validUsers ? validUsers.filter(u => u && u.role === 'DISTRIBUTOR').map(u => `DIST: ${u.name || 'Unknown'}`) : [];
    const allDistrictNames = allDivisions ? allDivisions.flatMap(div => BD_DATA[div] ? Object.keys(BD_DATA[div]) : []).map(d => `DISTRICT: ${d}`) : [];
    const allThanaNames = allDivisions ? allDivisions.flatMap(div => BD_DATA[div] ? Object.keys(BD_DATA[div]).flatMap(dist => BD_DATA[div][dist] || []) : []).map(t => `THANA: ${t}`) : [];
    const marketOptions = Array.from(new Set([...distributorNames, ...allDistrictNames, ...allThanaNames].filter(Boolean)));

    // 🚀 IMPROVED: Smart Filtering for Marketing Targets
    const filteredMarketingTargets = (marketingTargets || []).filter(t => {
        if (!t) return false;
        let match = true;

        const search = targetSearchTerm.toLowerCase();
        const tName = (t.target_name || t.name || '').toLowerCase();
        const tArea = Array.isArray(t.districts) ? t.districts.join(' ').toLowerCase() : '';

        // Only filter if the user actually typed something
        if (targetSearchTerm) {
            match = match && (tName.includes(search) || tArea.includes(search));
        }
        if (targetFilterName) {
            match = match && tName.includes(targetFilterName.toLowerCase());
        }

        // Date filtering
        if (targetFilterStart && t.start_date) match = match && new Date(t.start_date) >= new Date(targetFilterStart);
        if (targetFilterEnd && t.end_date) match = match && new Date(t.end_date) <= new Date(targetFilterEnd);

        return match;
    });

    const paginatedMarketingTargets = filteredMarketingTargets.slice((currentTargetPage - 1) * TARGETS_PER_PAGE, currentTargetPage * TARGETS_PER_PAGE);

    // 🚀 NEW: Reset page to 1 when switching tabs to prevent "Blank Page" bug
    useEffect(() => {
        setCurrentTargetPage(1);
        setTargetSearchTerm('');
    }, [activeTab]);

    return (<div className="min-h-screen bg-[#050A15] text-white font-mono flex relative overflow-hidden uppercase">

            <Sidebar
                pendingShopCount={totalNotifications}
                user={user} activeTab={activeTab} setActiveTab={setActiveTab}
                isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
                onLogout={onLogout} isFinanceMenuOpen={isFinanceMenuOpen} setIsFinanceMenuOpen={setIsFinanceMenuOpen}
                isDistMenuOpen={isDistMenuOpen} setIsDistMenuOpen={setIsDistMenuOpen}
                isMarketingMenuOpen={isMarketingMenuOpen} setIsMarketingMenuOpen={setIsMarketingMenuOpen}
                isLicenseMenuOpen={isLicenseMenuOpen} setIsLicenseMenuOpen={setIsLicenseMenuOpen}
                onPasswordClick={() => setShowPasswordModal(true)}
                isLinduxUserMenuOpen={isLinduxUserMenuOpen} setIsLinduxUserMenuOpen={setIsLinduxUserMenuOpen}

                // 🚀 PASSING THE POPUP TRIGGER TO THE SIDEBAR
                onQrSetupClick={() => setShowQrModal(true)}
            />

            <main className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
                <header className="flex justify-between items-center p-4 md:px-8 border-b border-[#273A60] bg-[#050A15] shrink-0 h-[85px]">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-3xl text-gray-500 hover:text-white transition-colors mb-1 relative">
                            ≡
                            {!isSidebarOpen && shopUsers.filter(s => ['WAITING_ADMIN', 'WAITING_DISTRIBUTOR'].includes(s.approval?.status)).length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 text-[8px] flex items-center justify-center text-white font-black">
                                        {shopUsers.filter(s => ['WAITING_ADMIN', 'WAITING_DISTRIBUTOR'].includes(s.approval?.status)).length}
                                    </span>
                                </span>
                            )}
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-blue-500 uppercase tracking-tighter italic">LINDUX EMI CONTROL CENTER</h1>
                            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Identity: {user.name} | Role: {user.role}</p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar uppercase font-bold">


                    {/* 🚀 NEW: LINDUX USER CREATE FORM */}
                    {activeTab === 'lindux_user_create' && (
                        <div className="max-w-4xl mx-auto">
                            <form onSubmit={handleCreateLinduxUser} className="bg-[#111A35] p-8 border border-cyan-900/30 rounded shadow-2xl space-y-6 relative overflow-hidden uppercase font-bold text-[10px]">
                                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                                <h3 className="text-cyan-400 text-xs tracking-[0.2em] border-b border-[#273A60] pb-4 italic">Initialize Lindux User Profile</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1"><label className="text-gray-500 tracking-widest">Name</label><input required type="text" className="w-full bg-black border border-[#273A60] p-2 text-white outline-none" value={linduxUserForm.name} onChange={e => setLinduxUserForm({...linduxUserForm, name: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-gray-500 tracking-widest">Assign Password</label><input required type="text" className="w-full bg-black border border-[#273A60] p-2 text-white outline-none" value={linduxUserForm.password} onChange={e => setLinduxUserForm({...linduxUserForm, password: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-gray-500 tracking-widest">Father's Name</label><input required type="text" className="w-full bg-black border border-[#273A60] p-2 text-white outline-none" value={linduxUserForm.fatherName} onChange={e => setLinduxUserForm({...linduxUserForm, fatherName: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-gray-500 tracking-widest">Mother's Name</label><input required type="text" className="w-full bg-black border border-[#273A60] p-2 text-white outline-none" value={linduxUserForm.motherName} onChange={e => setLinduxUserForm({...linduxUserForm, motherName: e.target.value})} /></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#273A60]">
                                    <div className="space-y-1"><label className="text-gray-500 tracking-widest">Phone 1</label><input required type="text" className="w-full bg-black border border-[#273A60] p-2 text-white outline-none" value={linduxUserForm.phone1} onChange={e => setLinduxUserForm({...linduxUserForm, phone1: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-gray-500 tracking-widest">Phone 2 (Optional)</label><input type="text" className="w-full bg-black border border-[#273A60] p-2 text-white outline-none" value={linduxUserForm.phone2} onChange={e => setLinduxUserForm({...linduxUserForm, phone2: e.target.value})} /></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#273A60]">
                                    <input required type="text" placeholder="Address Line 1" className="w-full bg-black border border-[#273A60] p-2 text-white outline-none" value={linduxUserForm.address1} onChange={e => setLinduxUserForm({...linduxUserForm, address1: e.target.value})} />
                                    <input type="text" placeholder="Address Line 2" className="w-full bg-black border border-[#273A60] p-2 text-white outline-none" value={linduxUserForm.address2} onChange={e => setLinduxUserForm({...linduxUserForm, address2: e.target.value})} />
                                    <select required className="bg-black border border-[#273A60] p-2 text-cyan-300 outline-none" value={linduxUserForm.division} onChange={e => setLinduxUserForm({...linduxUserForm, division: e.target.value, district: '', thana: ''})}>
                                        <option value="">Select Division</option>{allDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <select required className="bg-black border border-[#273A60] p-2 text-cyan-300 outline-none" disabled={!linduxUserForm.division} value={linduxUserForm.district} onChange={e => setLinduxUserForm({...linduxUserForm, district: e.target.value, thana: ''})}>
                                        <option value="">Select District</option>{linduxUserCurrentDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <select required className="bg-black border border-[#273A60] p-2 text-cyan-300 outline-none" disabled={!linduxUserForm.district} value={linduxUserForm.thana} onChange={e => setLinduxUserForm({...linduxUserForm, thana: e.target.value})}>
                                        <option value="">Select Thana</option>{linduxUserCurrentThanas.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>

                                <div className="pt-4 border-t border-[#273A60]">
                                    <p className="text-cyan-500 tracking-widest mb-4">Job Role Configuration</p>
                                    <select required className="bg-black border border-[#273A60] p-3 text-cyan-300 outline-none w-full mb-6" value={linduxUserForm.role} onChange={e => setLinduxUserForm({...linduxUserForm, role: e.target.value})}>
                                        <option value="ADMIN">ADMIN</option>
                                        <option value="ACCOUNTS">ACCOUNTS</option>
                                        <option value="MARKETING">MARKETING</option>
                                        <option value="CALL_CENTER">CALL CENTER</option>
                                    </select>

                                    <p className="text-cyan-500 tracking-widest mb-4">Menu Permission Matrix</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-[#050A15] p-4 rounded border border-[#273A60]">
                                        {ALL_PERMISSIONS.map(perm => (
                                            <label key={perm} className="flex items-center gap-3 text-gray-300 cursor-pointer hover:text-cyan-400">
                                                <input type="checkbox" checked={linduxUserForm.permissions.includes(perm)} onChange={() => togglePermission(perm)} className="w-4 h-4 accent-cyan-500" />
                                                {perm.replace('_', ' ')}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-4 rounded text-[11px] tracking-[0.4em] shadow-xl shadow-cyan-900/40 transition-all">INITIALIZE LINDUX USER</button>
                            </form>
                        </div>
                    )}

                    {/* 🚀 NEW: LINDUX USER LIST TABLE */}
                    {activeTab === 'lindux_user_list' && (
                        <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl uppercase">
                            <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-300">Lindux User Directory</h3>
                                <button onClick={() => fetchData('auth/operators', setUsers)} className="text-[9px] bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full border border-cyan-500/30 hover:bg-cyan-500/40 transition-all font-black uppercase tracking-widest">↻ SYNC_DATA</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[9px] font-bold whitespace-nowrap uppercase">
                                    <thead className="bg-[#050A15] text-gray-500 tracking-widest font-bold">
                                    <tr>
                                        <th className="p-5">User ID</th>
                                        <th className="p-5">Name & Role</th>
                                        <th className="p-5 text-center">Contact</th>
                                        <th className="p-5">Location</th>
                                        <th className="p-5">Permissions Overview</th>
                                        <th className="p-5 text-right">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#162447]">
                                    {validUsers.filter(u => ['ADMIN', 'ACCOUNTS', 'MARKETING', 'CALL_CENTER'].includes(u.role)).map(u => (
                                        <tr key={u._id} className="hover:bg-cyan-900/5 transition-colors font-bold">
                                            <td className="p-5 text-cyan-400 font-mono">{String(u._id).slice(-6).toUpperCase()}</td>
                                            <td className="p-5">
                                                <div className="text-white text-xs">{u.name}</div>
                                                <div className={`font-black mt-1 text-[7px] tracking-widest ${u.role === 'ADMIN' ? 'text-red-500' : 'text-blue-500'}`}>{u.role}</div>
                                            </td>
                                            <td className="p-5 text-cyan-300 text-center font-mono">
                                                <div>{u.phone}</div>
                                                <div className="text-[7px] text-gray-600 mt-1 uppercase">{u.phone_alt || 'NO_SECONDARY'}</div>
                                            </td>
                                            <td className="p-5 text-gray-400 text-[8px]">
                                                {u.address?.thana ? `${u.address.thana}, ${u.address.district}` : 'N/A'}
                                            </td>
                                            <td className="p-5">
                                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                    {u.permissions?.length > 0 ? u.permissions.map(p => (
                                                        <span key={p} className="bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 px-1 py-0.5 rounded text-[6px]">{p.replace('_', ' ')}</span>
                                                    )) : <span className="text-gray-600 italic">Global Default</span>}
                                                </div>
                                            </td>
                                            <td className="p-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleMirror(u._id)} className="bg-purple-900/40 border border-purple-900/50 text-purple-400 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded text-[8px] transition-all font-black uppercase">MIRROR</button>
                                                    <button onClick={() => toggleUserLock(u._id, u.status || 'ACTIVE')} className={`px-4 py-1.5 rounded text-[8px] font-black tracking-widest transition-all ${u.status === 'LOCKED' ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg' : 'bg-red-900/40 text-red-500 border border-red-900/50 hover:bg-red-600 hover:text-white'}`}>
                                                        {u.status === 'LOCKED' ? 'UNLOCK_ID' : 'LOCK_ID'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {validUsers.filter(u => ['ADMIN', 'ACCOUNTS', 'MARKETING', 'CALL_CENTER'].includes(u.role)).length === 0 && (
                                        <tr><td colSpan="6" className="p-8 text-center text-gray-600 text-xs italic tracking-widest">No internal Lindux users found.</td></tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'home' && <HomeDashboard user={user} allDevices={allDevices} financeLedger={financeLedger} marketingTargets={marketingTargets} />}

                    {activeTab.startsWith('license_') && (
                        <LicenseFee activeTab={activeTab} setActiveTab={setActiveTab} marketOptions={marketOptions || []} />
                    )}

                    {/* 🚀 PAYMENT GATEWAYS TAB */}
                    {activeTab === 'gateways' && (
                        <div className="bg-[#111A35] border border-[#273A60] rounded-xl shadow-2xl p-6 md:p-8 uppercase font-bold max-w-4xl mx-auto mt-4">
                            <div className="border-b border-[#273A60] pb-4 mb-6 flex justify-between items-center">
                                <h2 className="text-xl font-black text-blue-400 tracking-widest">PAYMENT GATEWAY CONFIGURATION</h2>
                                <button onClick={() => fetchData('settings', setSystemConfig)} className="text-[9px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 hover:bg-blue-500/40 transition-all font-black">↻ SYNC</button>
                            </div>

                            <form onSubmit={handleUpdateSettings} className="space-y-8">
                                {/* bKash Section */}
                                <div className="bg-[#0A1128] border border-pink-500/30 rounded p-6">
                                    <h3 className="text-pink-500 font-black mb-4 flex items-center gap-2"><span className="text-xl">💳</span> BKASH CONFIGURATION</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <label className="flex items-center gap-3 text-gray-300 text-xs cursor-pointer">
                                            <input type="checkbox" checked={systemConfig.bkash_api || false} onChange={e => setSystemConfig({...systemConfig, bkash_api: e.target.checked})} className="w-4 h-4 accent-pink-500" />
                                            ENABLE AUTOMATED BKASH API (PGW)
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                        <div className="space-y-3 p-4 border border-[#273A60] rounded bg-[#050A15]">
                                            <label className="flex items-center gap-3 text-pink-400 text-xs cursor-pointer">
                                                <input type="checkbox" checked={systemConfig.bkash_merchant || false} onChange={e => setSystemConfig({...systemConfig, bkash_merchant: e.target.checked})} className="w-4 h-4 accent-pink-500" />
                                                ENABLE BKASH MERCHANT
                                            </label>
                                            <input type="text" placeholder="BKASH MERCHANT NUMBER" value={systemConfig.bkash_merchant_number || ''} onChange={e => setSystemConfig({...systemConfig, bkash_merchant_number: e.target.value})} className="w-full bg-[#111A35] border border-[#273A60] p-2 text-white outline-none rounded mt-2" disabled={!systemConfig.bkash_merchant} />
                                        </div>

                                        <div className="space-y-3 p-4 border border-[#273A60] rounded bg-[#050A15]">
                                            <label className="flex items-center gap-3 text-pink-400 text-xs cursor-pointer">
                                                <input type="checkbox" checked={systemConfig.bkash_personal || false} onChange={e => setSystemConfig({...systemConfig, bkash_personal: e.target.checked})} className="w-4 h-4 accent-pink-500" />
                                                ENABLE BKASH PERSONAL
                                            </label>
                                            <input type="text" placeholder="BKASH PERSONAL NUMBER" value={systemConfig.bkash_personal_number || ''} onChange={e => setSystemConfig({...systemConfig, bkash_personal_number: e.target.value})} className="w-full bg-[#111A35] border border-[#273A60] p-2 text-white outline-none rounded mt-2" disabled={!systemConfig.bkash_personal} />
                                        </div>
                                    </div>
                                </div>

                                {/* Nagad Section */}
                                <div className="bg-[#0A1128] border border-orange-500/30 rounded p-6">
                                    <h3 className="text-orange-500 font-black mb-4 flex items-center gap-2"><span className="text-xl">💰</span> NAGAD CONFIGURATION</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <label className="flex items-center gap-3 text-gray-300 text-xs cursor-pointer">
                                            <input type="checkbox" checked={systemConfig.nagad_api || false} onChange={e => setSystemConfig({...systemConfig, nagad_api: e.target.checked})} className="w-4 h-4 accent-orange-500" />
                                            ENABLE AUTOMATED NAGAD API (PGW)
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                        <div className="space-y-3 p-4 border border-[#273A60] rounded bg-[#050A15]">
                                            <label className="flex items-center gap-3 text-orange-400 text-xs cursor-pointer">
                                                <input type="checkbox" checked={systemConfig.nagad_merchant || false} onChange={e => setSystemConfig({...systemConfig, nagad_merchant: e.target.checked})} className="w-4 h-4 accent-orange-500" />
                                                ENABLE NAGAD MERCHANT
                                            </label>
                                            <input type="text" placeholder="NAGAD MERCHANT NUMBER" value={systemConfig.nagad_merchant_number || ''} onChange={e => setSystemConfig({...systemConfig, nagad_merchant_number: e.target.value})} className="w-full bg-[#111A35] border border-[#273A60] p-2 text-white outline-none rounded mt-2" disabled={!systemConfig.nagad_merchant} />
                                        </div>

                                        <div className="space-y-3 p-4 border border-[#273A60] rounded bg-[#050A15]">
                                            <label className="flex items-center gap-3 text-orange-400 text-xs cursor-pointer">
                                                <input type="checkbox" checked={systemConfig.nagad_personal || false} onChange={e => setSystemConfig({...systemConfig, nagad_personal: e.target.checked})} className="w-4 h-4 accent-orange-500" />
                                                ENABLE NAGAD PERSONAL
                                            </label>
                                            <input type="text" placeholder="NAGAD PERSONAL NUMBER" value={systemConfig.nagad_personal_number || ''} onChange={e => setSystemConfig({...systemConfig, nagad_personal_number: e.target.value})} className="w-full bg-[#111A35] border border-[#273A60] p-2 text-white outline-none rounded mt-2" disabled={!systemConfig.nagad_personal} />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded uppercase tracking-widest shadow-lg shadow-blue-900/20 transition-all text-xs">
                                        SAVE SYSTEM CONFIGURATION
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'all_devices' && (
                        <div className="space-y-4">
                            <div className="flex flex-col lg:flex-row justify-between items-center bg-[#0A1128] p-4 rounded border border-[#273A60] gap-4 shadow-lg">

                                {/* Search Bar */}
                                <div className="flex items-center bg-[#050A15] border border-[#273A60] px-3 py-2 rounded w-full lg:w-auto">
                                    <span className="text-gray-500 mr-2">🔍</span>
                                    <input type="text" placeholder="Search Customer..." value={deviceSearchTerm} onChange={(e) => setDeviceSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-600 font-bold uppercase w-full lg:w-48" />
                                </div>

                                {/* 🚀 NEW FILTER BUTTONS WITH "ALL DEVICE" ADDED */}
                                <div className="flex flex-wrap justify-center gap-2 text-[9px] font-black uppercase tracking-widest w-full lg:w-auto flex-1 px-4">
                                    <button onClick={() => {setDeviceFilter('ALL'); setCurrentDevicePage(1);}} className={`px-4 py-2 rounded transition-all shadow-md ${deviceFilter === 'ALL' ? 'bg-indigo-600 text-white border border-indigo-500' : 'bg-[#111A35] text-gray-400 border border-[#273A60] hover:text-indigo-400 hover:border-indigo-400/50'}`}>All Device</button>
                                    <button onClick={() => {setDeviceFilter('ACTIVE'); setCurrentDevicePage(1);}} className={`px-4 py-2 rounded transition-all shadow-md ${deviceFilter === 'ACTIVE' ? 'bg-blue-600 text-white border border-blue-500' : 'bg-[#111A35] text-gray-400 border border-[#273A60] hover:text-blue-400 hover:border-blue-400/50'}`}>All Active</button>
                                    <button onClick={() => {setDeviceFilter('LOCKED'); setCurrentDevicePage(1);}} className={`px-4 py-2 rounded transition-all shadow-md ${deviceFilter === 'LOCKED' ? 'bg-red-600 text-white border border-red-500' : 'bg-[#111A35] text-gray-400 border border-[#273A60] hover:text-red-400 hover:border-red-400/50'}`}>Locked</button>
                                    <button onClick={() => {setDeviceFilter('UNLOCKED'); setCurrentDevicePage(1);}} className={`px-4 py-2 rounded transition-all shadow-md ${deviceFilter === 'UNLOCKED' ? 'bg-green-600 text-white border border-green-500' : 'bg-[#111A35] text-gray-400 border border-[#273A60] hover:text-green-400 hover:border-green-400/50'}`}>Unlocked</button>
                                    <button onClick={() => {setDeviceFilter('UNINSTALLED'); setCurrentDevicePage(1);}} className={`px-4 py-2 rounded transition-all shadow-md ${deviceFilter === 'UNINSTALLED' ? 'bg-purple-600 text-white border border-purple-500' : 'bg-[#111A35] text-gray-400 border border-[#273A60] hover:text-purple-400 hover:border-purple-400/50'}`}>Full Uninstall</button>
                                </div>

                                {/* Pagination */}
                                <div className="text-[9px] font-bold text-gray-500 flex items-center gap-4 uppercase tracking-widest w-full lg:w-auto justify-between lg:justify-end shrink-0">
                                    <button onClick={() => setCurrentDevicePage(p => Math.max(1, p - 1))} className="hover:text-white transition-colors bg-[#111A35] px-3 py-2 rounded border border-[#273A60]">◀ PREV</button>
                                    <span className="whitespace-nowrap">PAGE {currentDevicePage} OF {totalDevicePages}</span>
                                    <button onClick={() => setCurrentDevicePage(p => Math.min(totalDevicePages, p + 1))} className="hover:text-white transition-colors bg-[#111A35] px-3 py-2 rounded border border-[#273A60]">NEXT ▶</button>
                                </div>
                            </div>

                            <div className="bg-[#111A35] border border-[#273A60] rounded overflow-hidden shadow-2xl">
                                <div className="p-4 bg-[#162447] border-b border-[#273A60] flex justify-between items-center">
                                    <h3 className="text-xs font-bold tracking-widest text-teal-400">All Network Devices</h3>
                                    <button onClick={() => fetchData('devices/all', setAllDevices)} className="text-[9px] bg-teal-500/20 text-teal-400 px-3 py-1 rounded-full border border-teal-500/30 hover:bg-teal-500/40 transition-all font-black uppercase tracking-widest">↻ SYNC_DATA</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[9px] whitespace-nowrap uppercase font-bold">
                                        <thead className="bg-[#050A15] text-gray-500 tracking-widest">
                                        <tr>
                                            <th className="p-4">Install Date</th>
                                            <th className="p-4">Customer Details</th>
                                            <th className="p-4">Assigned Shop</th>
                                            <th className="p-4 text-right">Price Matrix</th>
                                            <th className="p-4 text-center">Status</th>
                                            <th className="p-4 text-right">Security Actions</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#273A60]">
                                        {paginatedDevices.map((dev) => (
                                            <tr key={dev._id} className="hover:bg-[#0A1128] transition-colors">
                                                <td className="p-4 text-gray-400">{new Date(dev.createdAt).toLocaleDateString()}</td>
                                                <td className="p-4">
                                                    <div className="text-white">{dev.customer_name}</div>
                                                    <div className="text-gray-500 font-mono mt-1">{dev.customer_phone}</div>
                                                </td>
                                                <td className="p-4 text-teal-400">
                                                    {dev.shopkeeper_id?.name || 'UNKNOWN SHOP'}
                                                    <div className="text-[7px] text-gray-500 mt-1">{dev.shopkeeper_id?._id?.slice(-6).toUpperCase() || 'N/A'}</div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="text-gray-400">Total: ৳{dev.total_price}</div>
                                                    <div className="text-green-500 mt-1">Paid: ৳{dev.paid_so_far}</div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={dev.license_status === 'UNINSTALLED' ? 'text-gray-500 font-black' : (dev.is_locked ? 'text-red-500 font-black' : 'text-green-500 font-black')}>
                                                        ● {dev.license_status === 'UNINSTALLED' ? 'UNINSTALLED' : (dev.is_locked ? 'LOCKED' : 'ONLINE')}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {dev.diagnostics?.last_location?.lat ? (
                                                            <a href={`https://www.google.com/maps?q=${dev.diagnostics.last_location.lat},${dev.diagnostics.last_location.lng}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded border border-blue-500/30 hover:border-blue-400 transition-colors font-black text-[8px]">VIEW MAP</a>
                                                        ) : (
                                                            <button disabled className="text-gray-600 px-3 py-1.5 rounded border border-gray-700 bg-gray-900/50 cursor-not-allowed font-black text-[8px]">NO GPS</button>
                                                        )}
                                                        <button onClick={() => setSecureActionModal({ isOpen: true, device: dev, actionType: 'TRACK', step: 1, reason: 'Due to Customer Request', customReason: '', password: '' })} className="bg-[#2563eb] hover:bg-blue-500 text-white px-3 py-1.5 rounded text-[8px] transition-all font-black">TRACK</button>
                                                        <button onClick={() => setViewDetailsModal({isOpen: true, device: dev})} className="bg-transparent border border-[#273A60] text-gray-300 px-3 py-1.5 rounded text-[8px] hover:bg-gray-800 transition-all font-black">VIEW</button>
                                                        <button onClick={() => handleDeviceAction(dev._id, dev.is_locked ? 'UNBLOCK' : 'BLOCK')} className={`px-3 py-1.5 rounded text-[8px] font-black transition-all ${dev.is_locked ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-900/40 text-red-500 border border-red-900/50 hover:bg-red-600 hover:text-white'}`}>
                                                            {dev.is_locked ? 'UNLOCK' : 'LOCK'}
                                                        </button>
                                                        {dev.license_status === 'UNINSTALLED' ? (
                                                            <span className="text-green-500 font-black tracking-widest text-[10px] uppercase ml-2 flex items-center">SUCCESS</span>
                                                        ) : (
                                                            <button onClick={() => setSecureActionModal({ isOpen: true, device: dev, actionType: 'UNINSTALL', step: 1, reason: 'Due to Customer Request', customReason: '', password: '' })} className="bg-red-600 hover:bg-red-500 text-white font-black px-3 py-1.5 rounded text-[8px]">UNINSTALL</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {paginatedDevices.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-600 italic">No devices found in the matrix.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'dist_create' && (
                        <CreateOperator
                            handleCreateDistributor={handleCreateDistributor} distFormData={distFormData} setDistFormData={setDistFormData}
                            allDivisions={allDivisions} currentDistricts={currentDistricts} currentThanas={currentThanas} marketAreaThanas={marketAreaThanas}
                        />
                    )}

                    {/* 🚀 DELEGATE MARKETING TABS TO MARKETING.JSX */}
                    {(activeTab === 'marketing_targets' || activeTab === 'marketing_achievements') && (
                        <Marketing
                            activeTab={activeTab}
                            allDevices={allDevices}
                            users={users}
                            targetForm={targetForm}
                            setTargetForm={setTargetForm}
                            handleCreateTarget={handleCreateTarget}
                            allBDDistricts={allBDDistricts}
                            targetAvailableThanas={targetAvailableThanas}
                            fetchData={fetchData}
                            setMarketingTargets={setMarketingTargets}
                            marketingTargets={marketingTargets}
                            paginatedMarketingTargets={paginatedMarketingTargets}
                            editTargetModal={editTargetModal}
                            setEditTargetModal={setEditTargetModal}
                            handleUpdateTarget={handleUpdateTarget}
                            filteredMarketingTargets={filteredMarketingTargets}
                            targetSearchTerm={targetSearchTerm}
                            setTargetSearchTerm={setTargetSearchTerm}
                        />
                    )}

                    {(activeTab === 'shop' || activeTab === 'shop_list') && (
                        <ShopList
                            escalatedShops={escalatedShops} shopSearchTerm={shopSearchTerm} setShopSearchTerm={setShopSearchTerm}
                            currentShopPage={currentShopPage} setCurrentShopPage={setCurrentShopPage} totalShopPages={totalShopPages}
                            paginatedShops={paginatedShops} SHOPS_PER_PAGE={SHOPS_PER_PAGE} fetchData={fetchData} setUsers={setUsers}
                            setViewShopModal={setViewShopModal} toggleUserLock={toggleUserLock} setShopApproveModal={setShopApproveModal}
                            viewShopModal={viewShopModal} shopApproveModal={shopApproveModal}
                        />
                    )}

                    {/* 🚀 DELEGATE ALL FINANCE TABS TO FINANCE.JSX */}
                    {(activeTab.startsWith('finance') || activeTab.startsWith('entry_')) && (
                        <Finance
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            financeLedger={financeLedger}
                            setFinanceLedger={setFinanceLedger}
                            filteredLedger={filteredLedger}
                            financeSearchTerm={financeSearchTerm}
                            setFinanceSearchTerm={setFinanceSearchTerm}
                            financeStartDate={financeStartDate}
                            setFinanceStartDate={setFinanceStartDate}
                            financeEndDate={financeEndDate}
                            setFinanceEndDate={setFinanceEndDate}
                            totalIncome={totalIncome}
                            totalExpense={totalExpense}
                            incomeEntries={incomeEntries}
                            expenseEntries={expenseEntries}
                            unusedBalanceList={unusedBalanceList}
                            setUnusedBalanceList={setUnusedBalanceList}
                            filteredUnused={filteredUnused}
                            unusedStartDate={unusedStartDate}
                            setUnusedStartDate={setUnusedStartDate}
                            unusedEndDate={unusedEndDate}
                            setUnusedEndDate={setUnusedEndDate}
                            totalUnusedLiability={totalUnusedLiability}
                            viewUnusedModal={viewUnusedModal}
                            setViewUnusedModal={setViewUnusedModal}
                            financeFormModal={financeFormModal}
                            setFinanceFormModal={setFinanceFormModal}
                            handleFinanceSubmit={handleFinanceSubmit}
                            rechargeForm={rechargeForm}
                            setRechargeForm={setRechargeForm}
                            handleShopRechargeSubmit={handleShopRechargeSubmit}
                            rechargeSearchQuery={rechargeSearchQuery}
                            setRechargeSearchQuery={setRechargeSearchQuery}
                            filteredRechargeShops={filteredRechargeShops}
                            isRechargeSearchOpen={isRechargeSearchOpen}
                            setIsRechargeSearchOpen={setIsRechargeSearchOpen}
                            handleApprovePayout={handleApprovePayout}
                            handleReleasePayout={handleReleasePayout}
                            fetchData={fetchData}
                            user={user}
                        />
                    )}

                    {/* 🚀 DELEGATE DISTRIBUTOR & SR TABS */}
                    {['dist_create', 'dist_ac', 'dist_details', 'sr_details', 'sr_ac'].includes(activeTab) && (
                        <DistributorSR
                            activeTab={activeTab}
                            handleCreateDistributor={handleCreateDistributor}
                            distFormData={distFormData}
                            setDistFormData={setDistFormData}
                            allDivisions={allDivisions}
                            currentDistricts={currentDistricts}
                            currentThanas={currentThanas}
                            marketAreaThanas={marketAreaThanas}
                            commStartDate={commStartDate}
                            setCommStartDate={setCommStartDate}
                            commEndDate={commEndDate}
                            setCommEndDate={setCommEndDate}
                            financeLedger={financeLedger}
                            setFinanceLedger={setFinanceLedger}
                            fetchData={fetchData}
                            validUsers={validUsers}
                            setUsers={setUsers}
                            viewCommModal={viewCommModal}
                            setViewCommModal={setViewCommModal}
                            generateCommissionPDF={generateCommissionPDF}
                            toggleUserLock={toggleUserLock}
                            viewDistModal={viewDistModal}
                            setViewDistModal={setViewDistModal}
                        />
                    )}

                    {/* 🚀 ACTIVITY LOGS TAB */}
                    {activeTab === 'activity_logs' && (
                        <ActivityLog
                            logs={activityLogs}
                            onRefresh={() => fetchData('admin/audit-logs', setActivityLogs)}
                        />
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

                    {/* 🚀 NEW: QR CODE SETUP MODAL */}
                    {showQrModal && (
                        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[500]">
                            <div className="bg-[#111A35] border border-[#273A60] rounded-xl p-8 max-w-md w-full shadow-2xl relative uppercase font-bold">
                                <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl font-black">✕</button>
                                <h3 className="text-xl font-black uppercase text-blue-400 mb-6 border-b border-[#273A60] pb-4 tracking-widest">APP QR CONFIGURATION</h3>

                                <div className="space-y-6 text-[10px]">
                                    <div className="bg-[#0A1128] p-4 rounded border border-[#273A60]">
                                        <label className="text-blue-300 mb-2 block tracking-widest font-black">QR 1 (SERVER A)</label>
                                        <input type="file" accept="image/*" onChange={(e) => handleQrUpload(e, 1)} className="w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-[9px] file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-500" />
                                        {systemConfig.qr1_image && <img src={systemConfig.qr1_image} className="h-24 mt-3 rounded bg-white p-1" alt="QR1" />}
                                    </div>

                                    <div className="bg-[#0A1128] p-4 rounded border border-[#273A60]">
                                        <label className="text-purple-300 mb-2 block tracking-widest font-black">QR 2 (SERVER B)</label>
                                        <input type="file" accept="image/*" onChange={(e) => handleQrUpload(e, 2)} className="w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-[9px] file:font-black file:bg-purple-600 file:text-white hover:file:bg-purple-500" />
                                        {systemConfig.qr2_image && <img src={systemConfig.qr2_image} className="h-24 mt-3 rounded bg-white p-1" alt="QR2" />}
                                    </div>

                                    <div>
                                        <label className="text-gray-500 mb-2 block tracking-widest">DISPLAY SETTING FOR SHOPS</label>
                                        <select value={systemConfig.active_qr || 'BOTH'} onChange={e => setSystemConfig({...systemConfig, active_qr: e.target.value})} className="bg-[#050A15] border border-[#273A60] p-3 text-white outline-none rounded w-full cursor-pointer font-bold">
                                            <option value="1">SHOW QR 1 ONLY</option>
                                            <option value="2">SHOW QR 2 ONLY</option>
                                            <option value="BOTH">SHOW BOTH QR CODES</option>
                                        </select>
                                    </div>

                                    <button onClick={(e) => { handleUpdateSettings(e); setShowQrModal(false); }} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded uppercase tracking-widest shadow-lg mt-4 transition-all">
                                        SAVE & PUBLISH TO SHOPS
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 🚀 VIEW CUSTOMER DETAILS MODAL (LIKE SHOPKEEPER DASHBOARD) */}
                    {viewDetailsModal.isOpen && viewDetailsModal.device && (
                        <div className="fixed inset-0 bg-[#050A15]/95 flex items-center justify-center p-4 z-[500]">
                            <div className="bg-[#0A1128] border border-[#273A60] rounded-xl w-full max-w-2xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto font-mono uppercase font-bold">
                                <button onClick={() => setViewDetailsModal({isOpen: false, device: null})} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 font-black text-xl">✕</button>

                                <h2 className="text-2xl font-black text-white mb-2 tracking-widest">{viewDetailsModal.device.customer_name}</h2>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-[9px] text-gray-400 bg-[#050A15] p-4 rounded border border-[#273A60]">
                                    <div><span className="text-blue-500 font-black tracking-widest">CUSTOMER PHONE:</span><br/>{viewDetailsModal.device.customer_phone}</div>
                                    <div className="md:col-span-2"><span className="text-blue-500 font-black tracking-widest">CUSTOMER ADDRESS:</span><br/>{viewDetailsModal.device.customer_address}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6 text-xs bg-[#050A15] p-4 border border-[#273A60] rounded uppercase">
                                    <div><span className="text-gray-500">Total Price:</span> ৳{viewDetailsModal.device.total_price}</div>
                                    <div><span className="text-gray-500">Paid So Far:</span> <span className="text-green-500">৳{viewDetailsModal.device.paid_so_far}</span></div>
                                    <div className="col-span-2 text-red-500 font-black border-t border-[#273A60] pt-2 text-sm tracking-widest">CURRENT DUE: ৳{(Number(viewDetailsModal.device.total_price) || 0) - (Number(viewDetailsModal.device.paid_so_far) || 0)}</div>
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
                            </div>
                        </div>
                    )}

                    {/* 🚀 SECURE ACTION MODAL (TRACK / UNINSTALL) */}
                    {secureActionModal.isOpen && (
                        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[500]">
                            <div className="bg-[#111A35] border border-red-500/50 p-8 rounded-xl w-full max-w-sm shadow-2xl font-mono uppercase text-white">
                                <h3 className="text-red-500 font-black text-center mb-6 tracking-widest uppercase text-lg">
                                    AUTHORIZE {secureActionModal.actionType}
                                </h3>

                                {secureActionModal.step === 1 && (
                                    <>
                                        <label className="text-[9px] text-gray-500 mb-2 block tracking-widest font-bold">SELECT REASON</label>
                                        <select
                                            className="bg-[#050A15] border border-[#273A60] w-full p-3 text-xs mb-4 outline-none text-white font-bold"
                                            value={secureActionModal.reason}
                                            onChange={(e) => setSecureActionModal({...secureActionModal, reason: e.target.value})}
                                        >
                                            <option value="Due to Customer Request">Due to Customer Request</option>
                                            <option value="Due to Shop Request">Due to Shop Request</option>
                                            <option value="Other">Other</option>
                                        </select>

                                        {secureActionModal.reason === 'Other' && (
                                            <>
                                                <label className="text-[9px] text-gray-500 mb-2 block tracking-widest font-bold">WRITE REASON</label>
                                                <input
                                                    type="text"
                                                    className="bg-[#050A15] border border-[#273A60] w-full p-3 text-xs mb-4 outline-none text-white font-bold"
                                                    placeholder="Enter reason..."
                                                    value={secureActionModal.customReason}
                                                    onChange={(e) => setSecureActionModal({...secureActionModal, customReason: e.target.value})}
                                                />
                                            </>
                                        )}

                                        <div className="flex gap-4 mt-6">
                                            <button onClick={() => setSecureActionModal({ isOpen: false, device: null, actionType: '', step: 1, reason: '', customReason: '', password: '' })} className="flex-1 bg-gray-800 py-3 rounded text-[10px] font-black hover:bg-gray-700 tracking-widest">CANCEL</button>
                                            <button onClick={() => setSecureActionModal({...secureActionModal, step: 2})} className="flex-1 bg-blue-600 py-3 rounded text-[10px] font-black uppercase hover:bg-blue-500 tracking-widest">OK</button>
                                        </div>
                                    </>
                                )}

                                {secureActionModal.step === 2 && (
                                    <form onSubmit={executeSecureAction}>
                                        <label className="text-[9px] text-gray-500 mb-2 block tracking-widest font-bold">ADMIN PASSWORD REQUIRED</label>
                                        <input
                                            type="password"
                                            required
                                            className="bg-[#050A15] border border-red-500/50 w-full p-3 text-xs mb-6 outline-none text-white font-bold"
                                            placeholder="Enter Password..."
                                            value={secureActionModal.password}
                                            onChange={(e) => setSecureActionModal({...secureActionModal, password: e.target.value})}
                                        />
                                        <div className="flex gap-4 mt-2">
                                            <button type="button" onClick={() => setSecureActionModal({...secureActionModal, step: 1, password: ''})} className="flex-1 bg-gray-800 py-3 rounded text-[10px] font-black hover:bg-gray-700 tracking-widest">BACK</button>
                                            <button type="submit" className="flex-1 bg-red-600 py-3 rounded text-[10px] font-black uppercase hover:bg-red-500 shadow-lg shadow-red-900/50 tracking-widest">EXECUTE</button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;