import React, {useEffect, useRef, useState} from "react";

const MultiSelectDropdown = ({ title, options, selected, onChange, onToggleAll }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const isAllSelected = options.length > 0 && options.every(opt => selected.includes(opt));
    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="w-full bg-[#050A15] border border-[#273A60] p-3 rounded text-xs text-blue-300 cursor-pointer flex justify-between items-center h-[46px] outline-none font-bold">
                <span className="truncate pr-2">{selected.length === 0 ? `Select ${title}` : `${selected.length} Selected`}</span>
                <span className={`transform transition-transform text-[10px] ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </div>
            {isOpen && (
                <div className="absolute z-[100] w-full mt-1 bg-[#111A35] border border-[#273A60] rounded shadow-2xl max-h-56 overflow-y-auto custom-scrollbar uppercase">
                    <label className="flex items-center gap-3 p-3 bg-[#1a2950] cursor-pointer sticky top-0 z-20">
                        <input type="checkbox" className="w-4 h-4 accent-blue-500" checked={isAllSelected} onChange={(e) => onToggleAll(e.target.checked)} />
                        <span className="text-xs font-bold text-blue-300">Toggle All</span>
                    </label>
                    {options.map(option => (
                        <label key={option} className="flex items-center gap-3 p-3 hover:bg-[#162447] cursor-pointer border-b border-[#273A60]/50 last:border-0 font-bold">
                            <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={selected.includes(option)} onChange={() => onChange(option)} />
                            <span className="text-xs text-gray-300">{option}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MultiSelectDropdown;