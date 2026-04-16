import React from 'react';
import MultiSelectDropdown from "./admin/MultiSelectDropdown.jsx";

const CreateOperator = ({
                            handleCreateDistributor, distFormData, setDistFormData,
                            allDivisions, currentDistricts, currentThanas, marketAreaThanas
                        }) => {
    return (
        <div className="max-w-4xl mx-auto">
            <form onSubmit={handleCreateDistributor} className="bg-[#111A35] p-8 border border-indigo-900/30 rounded shadow-2xl space-y-8 relative overflow-hidden uppercase font-bold">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <h3 className="text-indigo-400 font-black text-xs uppercase tracking-[0.2em] border-b border-[#273A60] pb-4 italic tracking-widest">Initialize Field Operator Profile</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase tracking-widest">Profile Role</label>
                        <select className="w-full bg-black border border-[#273A60] p-3 text-xs text-indigo-400 font-bold" value={distFormData.role} onChange={e => setDistFormData({...distFormData, role: e.target.value})}>
                            <option value="DISTRIBUTOR">DISTRIBUTOR (Macro Field)</option>
                            <option value="SR">SR (Sales Representative)</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase tracking-widest">Assign Password</label>
                        <input required type="text" placeholder="Assign Secure Password" title="Password" className="w-full bg-black border border-[#273A60] p-3 text-xs text-white" value={distFormData.password} onChange={e => setDistFormData({...distFormData, password: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] text-gray-500">Full Name</label>
                        <input required type="text" className="w-full bg-black border border-[#273A60] p-3 text-xs" value={distFormData.fullName} onChange={e => setDistFormData({...distFormData, fullName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] text-gray-500">Business Name</label>
                        <input required type="text" className="w-full bg-black border border-[#273A60] p-3 text-xs" value={distFormData.businessName} onChange={e => setDistFormData({...distFormData, businessName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] text-gray-500">Father's Name</label>
                        <input required type="text" className="w-full bg-black border border-[#273A60] p-3 text-xs" value={distFormData.fatherName} onChange={e => setDistFormData({...distFormData, fatherName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] text-gray-500">Mother's Name</label>
                        <input required type="text" className="w-full bg-black border border-[#273A60] p-3 text-xs" value={distFormData.motherName} onChange={e => setDistFormData({...distFormData, motherName: e.target.value})} />
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-indigo-900/20">
                    <p className="text-[9px] text-indigo-500 font-black tracking-widest uppercase">Base / Residential Address</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input required type="text" placeholder="Address Line 1" className="w-full bg-black border border-[#273A60] p-3 text-xs" value={distFormData.address1} onChange={e => setDistFormData({...distFormData, address1: e.target.value})} />
                        <input type="text" placeholder="Address Line 2" className="w-full bg-black border border-[#273A60] p-3 text-xs" value={distFormData.address2} onChange={e => setDistFormData({...distFormData, address2: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <select required className="bg-black border border-[#273A60] p-3 text-xs text-indigo-300 outline-none font-bold" value={distFormData.division} onChange={e => setDistFormData({...distFormData, division: e.target.value, district: '', thana: ''})}>
                            <option value="">Division</option>{allDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select required className="bg-black border border-[#273A60] p-3 text-xs text-indigo-300 outline-none font-bold" disabled={!distFormData.division} value={distFormData.district} onChange={e => setDistFormData({...distFormData, district: e.target.value, thana: ''})}>
                            <option value="">District</option>{currentDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select required className="bg-black border border-[#273A60] p-3 text-xs text-indigo-300 outline-none font-bold" disabled={!distFormData.district} value={distFormData.thana} onChange={e => setDistFormData({...distFormData, thana: e.target.value})}>
                            <option value="">Thana</option>{currentThanas.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-indigo-900/20 uppercase font-black">
                    <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Primary Phone (Phone 1)</label>
                        <input required type="text" placeholder="Identity Number" className="w-full bg-black border border-[#273A60] p-3 text-xs text-white" value={distFormData.phone1} onChange={e => setDistFormData({...distFormData, phone1: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Secondary Phone (Optional)</label>
                        <input type="text" placeholder="Alternative Number" className="w-full bg-black border border-[#273A60] p-3 text-xs text-white" value={distFormData.phone2} onChange={e => setDistFormData({...distFormData, phone2: e.target.value})} />
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-indigo-900/20 uppercase font-black">
                    <p className="text-[9px] text-indigo-500 font-black tracking-widest uppercase">Target Market Operating Territory</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-bold">
                        <MultiSelectDropdown title="Operating Districts" options={currentDistricts} selected={distFormData.marketDistricts} onChange={v => setDistFormData(p=>({...p, marketDistricts: p.marketDistricts.includes(v) ? p.marketDistricts.filter(x=>x!==v) : [...p.marketDistricts, v]}))} onToggleAll={s => setDistFormData(p=>({...p, marketDistricts: s ? currentDistricts : []}))} />
                        <MultiSelectDropdown title="Operating Thanas" options={marketAreaThanas} selected={distFormData.marketThanas} onChange={v => setDistFormData(p=>({...p, marketThanas: p.marketThanas.includes(v) ? p.marketThanas.filter(x=>x!==v) : [...p.marketThanas, v]}))} onToggleAll={s => setDistFormData(p=>({...p, marketThanas: s ? marketAreaThanas : []}))} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase tracking-widest">Specific Market Area Name</label>
                        <input required type="text" placeholder="e.g. Uttara Commercial Zone" className="w-full bg-black border border-[#273A60] p-3 text-xs text-indigo-300" value={distFormData.marketName} onChange={e => setDistFormData({...distFormData, marketName: e.target.value})} />
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-indigo-900/20 uppercase font-black">
                    <p className="text-[9px] text-indigo-500 font-black tracking-widest">Commission Matrix (Configuration Required)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-black/30 p-4 border border-[#273A60]">
                            <p className="text-[9px] text-gray-500 mb-2 tracking-widest uppercase">A. Commission Per User ID</p>
                            <input required type="number" placeholder="৳ Amount" className="w-full bg-black border border-indigo-900/30 p-3 text-xs text-indigo-400" value={distFormData.commPerUser} onChange={e => setDistFormData({...distFormData, commPerUser: e.target.value})} />
                            <p className="text-[8px] text-gray-600 mt-2 italic">(TRIGGER: Success ID Creation & ৳1000 Deposit)</p>
                        </div>
                        <div className="bg-black/30 p-4 border border-[#273A60]">
                            <p className="text-[9px] text-gray-500 mb-2 tracking-widest uppercase">B. Commission Per License Key</p>
                            <input required type="number" placeholder="৳ Amount" className="w-full bg-black border border-indigo-900/30 p-3 text-xs text-indigo-400" value={distFormData.commPerLicense} onChange={e => setDistFormData({...distFormData, commPerLicense: e.target.value})} />
                            <p className="text-[8px] text-gray-600 mt-2 italic">(TRIGGER: License Fee Deduction Success)</p>
                        </div>
                    </div>
                </div>

                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 py-5 rounded text-[11px] font-black tracking-[0.4em] transition-all shadow-xl shadow-indigo-900/40 uppercase">INITIALIZE_OPERATOR_DATA_STREAM</button>
            </form>
        </div>
    );
};

export default CreateOperator;