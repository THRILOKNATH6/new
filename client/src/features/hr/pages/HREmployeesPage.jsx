import { useState } from 'react';
import EmployeeList from '../components/EmployeeList';
import HRStats from '../components/HRStats';
import { HRDepartments, HRDesignations } from '../components/HRMasters';
import HRMappingManager from '../components/HRMappingManager';

export default function HREmployeesPage() {
    const [activeTab, setActiveTab] = useState('employees');

    const tabs = [
        { id: 'employees', label: 'Employees' },
        { id: 'departments', label: 'Departments' },
        { id: 'designations', label: 'Designations' },
        { id: 'governance', label: 'Governance' },
    ];

    return (
        <div className="flex flex-col gap-2">
            <h1 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">Personnel & Resource Management</h1>

            {/* COMPACT TABS */}
            <div className="border-b border-slate-200 bg-white">
                <nav className="flex space-x-6 px-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                py-2 px-1 border-b-2 font-black text-[11px] uppercase tracking-wider transition-none
                                ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'}
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* CONTENT */}
            <div className="mt-1">
                {activeTab === 'employees' && <EmployeeList />}
                {(activeTab === 'departments' || activeTab === 'designations' || activeTab === 'governance') && (
                    <div className="op-card">
                        {activeTab === 'departments' && <HRDepartments />}
                        {activeTab === 'designations' && <HRDesignations />}
                        {activeTab === 'governance' && <HRMappingManager />}
                    </div>
                )}
            </div>
        </div>
    );
}
