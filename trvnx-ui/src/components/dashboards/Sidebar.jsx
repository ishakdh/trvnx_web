import React, {useState} from 'react';

const Sidebar = ({
                     pendingShopCount,
                     user, activeTab, setActiveTab,
                     isSidebarOpen, setIsSidebarOpen, onLogout,
                     isFinanceMenuOpen, setIsFinanceMenuOpen,
                     isDistMenuOpen, setIsDistMenuOpen,
                     isMarketingMenuOpen, setIsMarketingMenuOpen,
                     isLicenseMenuOpen, setIsLicenseMenuOpen,
                     onPasswordClick,
                     isLinduxUserMenuOpen, setIsLinduxUserMenuOpen, // 🚀 NEW: State for Lindux User Menu
                     onQrSetupClick // 🚀 ADDED: Prop to trigger the QR Modal in AdminDashboard
                 }) => {
    const canSeeFinance = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS'].includes(user.role);
    const canSeeRegistry = ['SUPER_ADMIN', 'ADMIN', 'MARKETING', 'CALL_CENTER'].includes(user.role);
    const canSeeSettings = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);

    const navClass = (id) => `flex items-center gap-4 px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all ${activeTab === id ? 'bg-[#0F172A] text-white border-l-4 border-white' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'}`;

    return (
        <aside
            className={`${isSidebarOpen ? 'w-64 border-r' : 'w-20 border-r'} shrink-0 transition-all duration-300 ease-in-out bg-[#0A1128] border-[#273A60] flex flex-col z-20 whitespace-nowrap overflow-hidden uppercase`}
            onMouseEnter={() => setIsSidebarOpen(true)}
            onMouseLeave={() => setIsSidebarOpen(false)}
        >
            <div className="p-6 border-b border-[#273A60] flex justify-between items-center h-[85px] shrink-0">
                {isSidebarOpen ? (
                    <div>
                        <h2 className="text-lg font-black tracking-tighter text-blue-500 italic">Lindux EMI</h2>
                        <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-1">SUPER_ADMIN</p>
                    </div>
                ) : (
                    <div className="text-xl font-black text-blue-500 mx-auto italic">T</div>
                )}
            </div>

            <div className="p-4 flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar">
                {isSidebarOpen && <div className="text-[8px] text-gray-500 font-bold mb-4 tracking-widest uppercase px-2">System_Modules</div>}

                <button onClick={() => setActiveTab('home')} className={navClass('home')}>
                    <span className="text-sm">🏠</span>
                    {isSidebarOpen && <span>HOME</span>}
                </button>

                {canSeeFinance && (
                    <div className="flex flex-col">
                        <button onClick={() => setIsFinanceMenuOpen(!isFinanceMenuOpen)} className={`px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all flex justify-between items-center ${activeTab.startsWith('finance') ? 'text-orange-400' : 'text-gray-500 hover:bg-gray-800'}`}>
                            <div className="flex items-center gap-4">
                                <span className="text-sm">💳</span>
                                {isSidebarOpen && <span>FINANCE</span>}
                            </div>
                            {isSidebarOpen && <span>{isFinanceMenuOpen ? '▼' : '▶'}</span>}
                        </button>
                        {isFinanceMenuOpen && isSidebarOpen && (
                            <div className="ml-4 pl-4 border-l border-orange-900/40 flex flex-col gap-1 mt-1">
                                <button onClick={() => setActiveTab('finance_entry_income')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'finance_entry_income' ? 'text-green-400 bg-green-500/10' : 'text-gray-600 hover:text-green-400 transition-colors'}`}>ENTRY INCOME</button>
                                <button onClick={() => setActiveTab('finance_entry_expense')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'finance_entry_expense' ? 'text-red-400 bg-red-500/10' : 'text-gray-600 hover:text-red-400 transition-colors'} mt-2`}>ENTRY EXPENSE</button>
                                <button onClick={() => setActiveTab('finance_balance')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'finance_balance' ? 'text-orange-300 bg-orange-500/10' : 'text-gray-600 hover:text-orange-400 transition-colors'} mt-2`}>BALANCE SHEET</button>
                                <button onClick={() => setActiveTab('finance_cashbook')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'finance_cashbook' ? 'text-green-300 bg-green-500/10' : 'text-gray-600 hover:text-green-400 transition-colors'} mt-2`}>CASH BOOK</button>
                                <button onClick={() => setActiveTab('finance_unused')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'finance_unused' ? 'text-blue-300 bg-blue-500/10' : 'text-gray-600 hover:text-blue-400 transition-colors'} mt-2`}>UNUSED BALANCE</button>
                                <button onClick={() => setActiveTab('finance_recharge')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'finance_recharge' ? 'text-teal-300 bg-teal-500/10' : 'text-gray-600 hover:text-teal-400 transition-colors'} mt-2`}>RECHARGE TO SHOP</button>
                                <button onClick={() => setActiveTab('finance_payouts')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'finance_payouts' ? 'text-purple-300 bg-purple-500/10' : 'text-gray-600 hover:text-purple-400 transition-colors'} mt-2`}>DISTRIBUTOR PAYOUTS</button>
                            </div>
                        )}
                    </div>
                )}

                {canSeeRegistry && (
                    <button onClick={() => setActiveTab('all_devices')} className={navClass('all_devices')}>
                        <span className="text-sm">📱</span>
                        {isSidebarOpen && <span>ALL_DEVICES</span>}
                    </button>
                )}

                {canSeeRegistry && (
                    <div className="flex flex-col">
                        <button onClick={() => setIsDistMenuOpen(!isDistMenuOpen)} className={`px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all flex justify-between items-center ${activeTab.startsWith('dist_') || activeTab.startsWith('sr_') ? 'text-indigo-400' : 'text-gray-500 hover:bg-gray-800'}`}>
                            <div className="flex items-center gap-4">
                                <span className="text-sm">🏢</span>
                                {isSidebarOpen && <span>DISTRIBUTOR/SR</span>}
                            </div>
                            {isSidebarOpen && <span>{isDistMenuOpen ? '▼' : '▶'}</span>}
                        </button>
                        {isDistMenuOpen && isSidebarOpen && (
                            <div className="ml-4 pl-4 border-l border-indigo-900/40 flex flex-col gap-1 mt-1">
                                <button onClick={() => setActiveTab('dist_create')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'dist_create' ? 'text-indigo-300 bg-indigo-500/10' : 'text-gray-600 hover:text-indigo-400 transition-colors'}`}>CREATE NEW</button>
                                <button onClick={() => setActiveTab('dist_details')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'dist_details' ? 'text-indigo-300 bg-indigo-500/10' : 'text-gray-600 hover:text-indigo-400 transition-colors'}`}>DISTRIBUTOR</button>
                                <button onClick={() => setActiveTab('sr_details')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'sr_details' ? 'text-indigo-300 bg-indigo-500/10' : 'text-gray-600 hover:text-indigo-400 transition-colors'}`}>SR</button>
                                <button onClick={() => setActiveTab('dist_ac')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'dist_ac' ? 'text-indigo-300 bg-indigo-500/10' : 'text-gray-600 hover:text-indigo-400 transition-colors'}`}>DISTRIBUTOR A/C</button>
                                <button onClick={() => setActiveTab('sr_ac')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'sr_ac' ? 'text-indigo-300 bg-indigo-500/10' : 'text-gray-600 hover:text-indigo-400 transition-colors'}`}>SR A/C</button>
                            </div>
                        )}
                    </div>
                )}

                {canSeeRegistry && (
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
                                <button onClick={() => setActiveTab('marketing_targets')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'marketing_targets' ? 'text-pink-300 bg-pink-500/10' : 'text-gray-600 hover:text-pink-400 transition-colors'}`}>TARGET PLANS</button>
                                <button onClick={() => setActiveTab('marketing_achievements')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'marketing_achievements' ? 'text-pink-300 bg-pink-500/10' : 'text-gray-600 hover:text-pink-400 transition-colors'}`}>TARGET & ACHIEVEMENT</button>
                            </div>
                        )}
                    </div>
                )}

                {canSeeRegistry && (
                    <button onClick={() => setActiveTab('shop_list')} className={`flex justify-between items-center w-full px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all ${activeTab === 'shop_list' ? 'bg-[#0F172A] text-blue-400 border-l-4 border-blue-500' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'}`}>
                        <div className="flex items-center gap-4">
                            <span className="text-sm">🛒</span>
                            {isSidebarOpen && <span>SHOP</span>}
                        </div>
                        {pendingShopCount > 0 && (
                            <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-lg shadow-red-900/50">
                                {pendingShopCount}
                            </span>
                        )}
                    </button>
                )}

                {/* 🚀 NEW: Lindux User Menu */}
                {canSeeSettings && (
                    <div className="flex flex-col">
                        <button onClick={() => setIsLinduxUserMenuOpen(!isLinduxUserMenuOpen)} className={`px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all flex justify-between items-center ${activeTab.startsWith('lindux_user') ? 'text-cyan-400' : 'text-gray-500 hover:bg-gray-800'}`}>
                            <div className="flex items-center gap-4">
                                <span className="text-sm">👨‍💻</span>
                                {isSidebarOpen && <span>LINDUX USER</span>}
                            </div>
                            {isSidebarOpen && <span>{isLinduxUserMenuOpen ? '▼' : '▶'}</span>}
                        </button>
                        {isLinduxUserMenuOpen && isSidebarOpen && (
                            <div className="ml-4 pl-4 border-l border-cyan-900/40 flex flex-col gap-1 mt-1">
                                <button onClick={() => setActiveTab('lindux_user_create')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'lindux_user_create' ? 'text-cyan-300 bg-cyan-500/10' : 'text-gray-600 hover:text-cyan-400 transition-colors'}`}>CREATE</button>
                                <button onClick={() => setActiveTab('lindux_user_list')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'lindux_user_list' ? 'text-cyan-300 bg-cyan-500/10' : 'text-gray-600 hover:text-cyan-400 transition-colors'}`}>USER</button>
                            </div>
                        )}
                    </div>
                )}

                {canSeeSettings && (
                    <div className="flex flex-col">
                        <button onClick={() => setIsLicenseMenuOpen(!isLicenseMenuOpen)} className={`px-4 py-3 rounded text-left text-[10px] font-bold tracking-widest transition-all flex justify-between items-center ${activeTab.startsWith('license_') ? 'text-blue-400' : 'text-gray-500 hover:bg-gray-800'}`}>
                            <div className="flex items-center gap-4">
                                <span className="text-sm">🔑</span>
                                {isSidebarOpen && <span>LICENSE FEE</span>}
                            </div>
                            {isSidebarOpen && <span>{isLicenseMenuOpen ? '▼' : '▶'}</span>}
                        </button>
                        {isLicenseMenuOpen && isSidebarOpen && (
                            <div className="ml-4 pl-4 border-l border-blue-900/40 flex flex-col gap-1 mt-1">
                                <button onClick={() => setActiveTab('license_offer')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'license_offer' ? 'text-blue-300 bg-blue-500/10' : 'text-gray-600 hover:text-blue-400 transition-colors'}`}>OFFER</button>
                                <button onClick={() => setActiveTab('license_create')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'license_create' ? 'text-blue-300 bg-blue-500/10' : 'text-gray-600 hover:text-blue-400 transition-colors'}`}>CREATE</button>
                                <button onClick={() => setActiveTab('license_list')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'license_list' ? 'text-blue-300 bg-blue-500/10' : 'text-gray-600 hover:text-blue-400 transition-colors'}`}>ALL FEE</button>
                                <button onClick={() => setActiveTab('license_all_offer')} className={`px-4 py-2 rounded text-left text-[9px] font-bold tracking-widest ${activeTab === 'license_all_offer' ? 'text-blue-300 bg-blue-500/10' : 'text-gray-600 hover:text-blue-400 transition-colors'}`}>ALL OFFER</button>
                            </div>
                        )}
                    </div>
                )}

                {canSeeSettings && (
                    <>
                        <button onClick={() => setActiveTab('gateways')} className={navClass('gateways')}>
                            <span className="text-sm">💳</span>
                            {isSidebarOpen && <span>PAYMENT_GATEWAY</span>}
                        </button>

                        {/* 🚀 FIXED: QR Code Button triggers modal via props */}
                        <button onClick={onQrSetupClick} className={navClass('qr_settings')}>
                            <span className="text-sm">🔲</span>
                            {isSidebarOpen && <span>QR CODE</span>}
                        </button>
                    </>
                )}
                <button
                    onClick={() => setActiveTab('activity_logs')}
                    className={`w-full text-left px-4 py-3 rounded text-[10px] font-black transition-all border-l-4 
        ${activeTab === 'activity_logs' ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg' : 'border-transparent text-gray-500 hover:bg-[#111A35] hover:text-gray-300'}`}
                >
                    📜 ACTIVITY LOGS
                </button>

                <div className="mt-auto pt-8 pb-4 flex flex-col gap-2">
                    <button onClick={onPasswordClick} className="w-full text-gray-500 hover:text-white px-4 py-3 rounded text-[10px] font-bold text-left hover:bg-gray-800 transition-all uppercase tracking-widest flex items-center gap-4">
                        <span className="text-sm">🔒</span>
                        {isSidebarOpen && <span>CHANGE_PASSWORD</span>}
                    </button>
                    <button onClick={onLogout} className="w-full bg-red-900/10 text-red-500 border border-red-900/50 px-4 py-3 rounded text-[10px] font-black text-left hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest flex items-center gap-4">
                        <span className="text-sm">⏻</span>
                        {isSidebarOpen && <span>LOGOUT</span>}
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;