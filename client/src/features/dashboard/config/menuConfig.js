import { Home, Users, Scissors, Settings, Activity, FileText, Target } from 'lucide-react';

export const MENU_ITEMS = [
    {
        label: 'Overview',
        path: '/dashboard',
        icon: Home,
        // No permission needed = Public for all authenticated users
    },
    {
        label: 'HR Management',
        path: '/dashboard/hr',
        icon: Users,
        requiredPermission: 'VIEW_HR_DATA'
    },
    {
        label: 'Order Management', // IT
        path: '/dashboard/it/orders',
        icon: FileText,
        requiredPermission: 'MANAGE_ORDERS'
    },
    // IE MANAGER ITEMS
    {
        label: 'All Orders',
        path: '/dashboard/ie/orders',
        icon: FileText,
        requiredPermission: 'VIEW_ORDERS'
    },
    {
        label: 'Line Management',
        path: '/dashboard/ie/lines',
        icon: Activity,
        requiredPermission: 'MANAGE_LINES'
    },
    {
        label: 'Production Staff',
        path: '/dashboard/ie/employees',
        icon: Users,
        requiredPermission: 'VIEW_PRODUCTION_EMPLOYEES'
    },
    {
        label: 'Operation Master',
        path: '/dashboard/ie/operations',
        icon: Target,
        requiredPermission: 'MANAGE_OPERATIONS'
    },
    {
        label: 'Machine Maint.',
        path: '/dashboard/machines',
        icon: Settings,
        requiredPermission: 'MANAGE_MACHINES'
    },
    {
        label: 'Cutting',
        path: '/dashboard/production/cutting',
        icon: Scissors,
        requiredPermission: 'MANAGE_CUTTING'
    },
    {
        label: 'Reports',
        path: '/dashboard/reports',
        icon: Activity,
        requiredPermission: 'VIEW_REPORTS'
    }
];
