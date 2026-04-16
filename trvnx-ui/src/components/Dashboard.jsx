import React, { useState, useEffect } from 'react';
import { io } from "socket.io-client";

// Logic: Connect to your backend
const socket = io("http://localhost:5000");

const Dashboard = ({ user, onLogout }) => {
    const [devices, setDevices] = useState([]);
    const [activeTab, setActiveTab] = useState('DEVICE_GRID');

    // Logic: Fetch real data from your backend
    const fetchDevices = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/agent/list');
            if (res.ok) {
                const data = await res.json();
                setDevices(data);
            }
        } catch (err) {
            console.error("Backend unreachable");
        }
    };

    useEffect(() => {
        fetchDevices();
        const interval = setInterval(fetchDevices, 5000); // Auto-refresh every 5s
        return () => clearInterval(interval);
    }, []);

    const sendCommand = (deviceId, command) => {
        socket.emit("SEND_COMMAND", { deviceId, command });
        alert(`Command ${command} sent to ${deviceId}`);
    };

    return (
        <div className="min-h-screen bg-[#0A1128] text-white flex font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-[#162447] border-r border-[#273A60] p-6 flex flex-col">
                <h1 className="text-2xl font-bold mb-10">TRVNX <span className="text-blue-500">OS</span></h1>
                <nav className="flex-1 space-y-2 text-[10px] font-mono uppercase tracking-widest">
                    <button className="w-full text-left p-3 bg-blue-600/20 text-blue-400 border-l-2 border-blue-500">Device_Grid</button>
                    <div className="p-3 opacity-20 cursor-not-allowed">Network_Map</div>
                    <div className="p-3 opacity-20 cursor-not-allowed">File_Drive</div>
                </nav>
                <button onClick={onLogout} className="text-red-500 font-mono text-[10px] uppercase p-3 hover:bg-red-500/10 rounded">Terminate_Session</button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8">
                <header className="mb-10 border-b border-[#273A60] pb-6">
                    <p className="text-[10px] text-blue-400 uppercase tracking-widest mb-1">TRVNX Command Center V2</p>
                    <h2 className="text-xl font-bold">{user.name} <span className="text-xs text-blue-500 ml-2">[{user.role}]</span></h2>
                </header>

                <div className="grid grid-cols-3 gap-6 mb-10 text-center">
                    <div className="bg-[#162447] p-6 rounded border border-[#273A60]">
                        <p className="text-[10px] text-blue-400 uppercase mb-2">Encryption</p>
                        <h3 className="text-xl font-bold font-mono">AES_256</h3>
                    </div>
                    <div className="bg-[#162447] p-6 rounded border border-[#273A60]">
                        <p className="text-[10px] text-blue-400 uppercase mb-2">Active_Agents</p>
                        <h3 className="text-xl font-bold font-mono">{devices.length}</h3>
                    </div>
                    <div className="bg-[#162447] p-6 rounded border border-[#273A60]">
                        <p className="text-[10px] text-blue-400 uppercase mb-2">System_Status</p>
                        <h3 className="text-xl font-bold font-mono text-green-500">ONLINE</h3>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    {devices.length === 0 ? (
                        <div className="col-span-3 border-2 border-dashed border-[#273A60] p-20 text-center rounded-lg opacity-20 font-mono tracking-[10px]">
                            WAITING_FOR_AGENT_SIGNAL...
                        </div>
                    ) : (
                        devices.map(dev => (
                            <div key={dev.deviceId} className="bg-[#162447] p-6 rounded border border-blue-500/30">
                                <h3 className="font-bold text-lg mb-1">{dev.model}</h3>
                                <p className="text-[10px] text-slate-400 font-mono mb-6">ID: {dev.deviceId.slice(-6).toUpperCase()}</p>
                                <div className="flex gap-2">
                                    <button onClick={() => sendCommand(dev.deviceId, 'VIBRATE')} className="flex-1 bg-slate-800 py-2 rounded text-[10px] font-bold uppercase hover:bg-slate-700">Ping</button>
                                    <button onClick={() => sendCommand(dev.deviceId, 'LOCK')} className="flex-1 bg-red-900/30 border border-red-500/50 py-2 rounded text-[10px] font-bold text-red-500 uppercase hover:bg-red-500 hover:text-white">Kill</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;