import React, { useState } from 'react';

const Login = ({ onLoginSuccess }) => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false); // Logic: Prevent double-clicks

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password }),
            });
            const data = await response.json();

            if (response.ok) {
                // Logic: Save credentials for PWA persistence
                localStorage.setItem('trvnx_token', data.token);
                localStorage.setItem('trvnx_user', JSON.stringify(data.user));

                // Logic: Trigger the App.jsx role-switcher
                onLoginSuccess(data.user);
            } else {
                setError(data.message || 'IDENTITY REJECTED');
            }
        } catch (err) {
            setError('CORE OFFLINE: CHECK BACKEND SERVER');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A1128] font-mono p-4">
            <div className="bg-[#162447] p-8 rounded-lg border border-[#273A60] w-full max-w-md shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-tighter">
                        TRVNX <span className="text-blue-500">OS</span>
                    </h1>
                    <p className="text-[#94A3B8] text-[10px] mt-2 uppercase tracking-widest">
                        Secure Gateway v1.0 // Auth_Module
                    </p>
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-500 text-red-200 p-3 rounded mb-6 text-[10px] text-center uppercase animate-pulse">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] text-blue-400 uppercase mb-1">Phone Identity</label>
                        <input
                            type="text"
                            className="w-full bg-[#050A15] border border-[#273A60] p-3 rounded text-white outline-none focus:border-blue-400 transition-colors"
                            placeholder="017XXXXXXXX"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            disabled={loading}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-blue-400 uppercase mb-1">Authorization Key</label>
                        <input
                            type="password"
                            className="w-full bg-[#050A15] border border-[#273A60] p-3 rounded text-white outline-none focus:border-blue-400 transition-colors"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded font-bold uppercase tracking-widest transition-all shadow-lg 
                        ${loading ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'}`}
                    >
                        {loading ? 'Verifying...' : 'Establish Link'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;