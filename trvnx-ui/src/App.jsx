import React, { useState, useEffect } from 'react';
import Login from './components/Login.jsx';

// Dashboards - Full Supply Chain Integration
import AdminDashboard from './components/dashboards/AdminDashboard.jsx';
import DistributorDashboard from './components/dashboards/DistributorDashboard.jsx';
import SRDashboard from './components/dashboards/SRDashboard.jsx';
import ShopkeeperDashboard from './components/dashboards/ShopkeeperDashboard.jsx';

function App() {
    const [user, setUser] = useState(null);
    const [isImpersonating, setIsImpersonating] = useState(false); // 🚀 NEW: Mirror State

    // Logic: Persistent Session (Keep user logged in on refresh)
    useEffect(() => {
        const savedUser = localStorage.getItem('trvnx_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }

        // 🚀 NEW: Detect if Admin is mirroring another user
        const originalAdminToken = localStorage.getItem('original_admin_token');
        if (originalAdminToken) {
            setIsImpersonating(true);
        }
    }, []);

    const handleLoginSuccess = (userData) => {
        setUser(userData);
        localStorage.setItem('trvnx_user', JSON.stringify(userData));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('trvnx_user');
        localStorage.removeItem('trvnx_token');
        // 🚀 NEW: Purge mirror tokens on logout to guarantee security
        localStorage.removeItem('original_admin_token');
        localStorage.removeItem('original_admin_user');
        setIsImpersonating(false);
    };

    // 🚀 NEW: The Portal Back to Admin Identity
    const handleReturnToAdmin = () => {
        const adminToken = localStorage.getItem('original_admin_token');
        const adminUser = localStorage.getItem('original_admin_user');

        if (adminToken && adminUser) {
            localStorage.setItem('trvnx_token', adminToken);
            localStorage.setItem('trvnx_user', adminUser);
            localStorage.removeItem('original_admin_token');
            localStorage.removeItem('original_admin_user');
            window.location.reload(); // Force full app reboot into Admin mode
        } else {
            handleLogout(); // Failsafe
        }
    };

    // Logic: The TRVNX Gatekeeper - Routes users based on Authorization Level
    const renderRoleBasedUI = () => {
        switch (user.role) {
            case 'SUPER_ADMIN':
            case 'ADMIN':
            case 'ACCOUNTS':        // 🚀 FIXED: Added new Lindux Roles so Mirror doesn't crash
            case 'MARKETING':       // 🚀 FIXED: Added new Lindux Roles
            case 'CALL_CENTER':     // 🚀 FIXED: Added new Lindux Roles
                return <AdminDashboard user={user} onLogout={handleLogout} />;

            case 'DISTRIBUTOR':
                return <DistributorDashboard user={user} onLogout={handleLogout} />;

            case 'SR':
                return <SRDashboard user={user} onLogout={handleLogout} />;

            case 'SHOPKEEPER':
                // Now live and authorized for retail operations!
                return <ShopkeeperDashboard user={user} onLogout={handleLogout} />;

            default:
                return (
                    <div className="min-h-screen bg-[#050A15] text-white flex flex-col items-center justify-center font-mono p-6 text-center">
                        <p className="text-red-500 mb-4 font-bold text-xl uppercase tracking-tighter">⚠️ System_Conflict</p>
                        <p className="text-gray-500 mb-8 text-xs">UNAUTHORIZED_ROLE_DETECTED: Contact TRVNX Support.</p>
                        <button
                            onClick={handleLogout}
                            className="px-6 py-2 bg-red-900/20 text-red-500 border border-red-900 rounded font-bold text-xs hover:bg-red-900 hover:text-white transition-all"
                        >
                            REBOOT_AUTH
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="trvnx-os-wrapper relative">
            {/* 🚀 NEW: Sticky Global Mirror Banner */}
            {isImpersonating && user && (
                <div className="fixed top-0 left-0 w-full bg-red-600 text-white font-black text-xs py-2 px-6 z-[9999] flex justify-between items-center tracking-widest uppercase shadow-[0_4px_20px_rgba(220,38,38,0.5)]">
                    <div className="flex items-center gap-3">
                        <span className="animate-pulse text-lg">⚠️</span>
                        <span>MIRROR MODE ACTIVE: VIEWING AS {user.name} ({user.role})</span>
                    </div>
                    <button
                        onClick={handleReturnToAdmin}
                        className="bg-black/40 hover:bg-black/60 border border-white/30 px-4 py-1.5 rounded transition-all shadow-lg"
                    >
                        RETURN TO ADMIN
                    </button>
                </div>
            )}

            <div className={`main-viewport w-full h-full min-h-screen bg-[#050A15] ${isImpersonating ? 'pt-10' : ''}`}>
                {!user ? (
                    <Login onLoginSuccess={handleLoginSuccess} />
                ) : (
                    renderRoleBasedUI()
                )}
            </div>
        </div>
    );
}

export default App;