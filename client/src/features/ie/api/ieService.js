import apiClient from '@/lib/apiClient';

export const getOrders = async () => {
    const { data } = await apiClient.get('/ie/orders');
    return data.data;
};

export const getOrderDetails = async (id) => {
    const { data } = await apiClient.get(`/ie/orders/${id}`);
    return data.data;
};

export const getProductionEmployees = async () => {
    const { data } = await apiClient.get('/ie/employees');
    return data.data;
};

export const getLines = async () => {
    const { data } = await apiClient.get('/ie/lines');
    return data.data;
};

export const getLineDetails = async (lineNo) => {
    const { data } = await apiClient.get(`/ie/lines/${lineNo}/details`);
    return data.data;
};

export const createLine = async (lineData) => {
    const { data } = await apiClient.post('/ie/lines', lineData);
    return data.data;
};

export const updateLine = async (lineNo, lineData) => {
    const { data } = await apiClient.put(`/ie/lines/${lineNo}`, lineData);
    return data.data;
};

export const deleteLine = async (lineNo) => {
    const { data } = await apiClient.delete(`/ie/lines/${lineNo}`);
    return data.data;
};

// --- Staff Assignment & Work Updates ---

export const getUnassignedStaff = async () => {
    const { data } = await apiClient.get('/ie/staff/unassigned');
    return data.data;
};

export const getLineStaff = async (lineNo) => {
    const { data } = await apiClient.get(`/ie/staff/line/${lineNo}`);
    return data.data;
};

export const getLineManpower = async (lineNo) => {
    const { data } = await apiClient.get(`/ie/staff/line/${lineNo}/manpower`);
    return data.data;
};

export const getLineOperations = async (lineNo) => {
    const { data } = await apiClient.get(`/ie/lines/${lineNo}/operations`);
    return data.data;
};

export const assignStaff = async (lineNo, employeeIds) => {
    const { data } = await apiClient.post('/ie/staff/assign', { lineNo, employeeIds });
    return data.data;
};

export const unassignStaff = async (employeeIds) => {
    const { data } = await apiClient.post('/ie/staff/unassign', { employeeIds });
    return data.data;
};

export const updateWorkDetails = async (empId, workData) => {
    const { data } = await apiClient.put(`/ie/staff/work/${empId}`, workData);
    return data.data;
};

export const getStaffPool = async () => {
    const { data } = await apiClient.get('/ie/staff/pool');
    return data.data;
};

export const getIEMasters = async () => {
    const { data } = await apiClient.get('/ie/masters');
    return data.data;
};

export const designateRole = async (lineNo, role, empId) => {
    const { data } = await apiClient.post(`/ie/lines/${lineNo}/designate-role`, { role, empId });
    return data.data;
};

// --- Operation Management ---

export const getOperations = async (sizeCategoryId, styleId) => {
    const { data } = await apiClient.get('/ie/operations', { params: { sizeCategoryId, styleId } });
    return data.data;
};

export const createOperation = async (opData) => {
    const { data } = await apiClient.post('/ie/operations', opData);
    return data.data;
};

export const updateOperation = async (opId, opData) => {
    const { data } = await apiClient.put(`/ie/operations/${opId}`, opData);
    return data.data;
};

export const deleteOperation = async (opId, sizeCategoryId) => {
    const { data } = await apiClient.delete(`/ie/operations/${opId}`, { params: { sizeCategoryId } });
    return data;
};
