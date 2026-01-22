import { useState, useEffect } from 'react';
import * as hrAPI from '../api/hrService';
import { Users, Briefcase, Plus } from 'lucide-react';

export default function HRStats() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Total Employees</h3>
                    <p className="text-3xl font-bold text-gray-800 mt-2">--</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                    <Users size={24} />
                </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Departments</h3>
                    <p className="text-3xl font-bold text-gray-800 mt-2">--</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                    <Briefcase size={24} />
                </div>
            </div>
            {/* ... Other stats ... */}
        </div>
    );
}
