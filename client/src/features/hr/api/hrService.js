import apiClient from '@/lib/apiClient';

export const getEmployees = async () => {
    const { data } = await apiClient.get('/hr/employees');
    return data;
};

export const createEmployee = async (employeeData) => {
    const { data } = await apiClient.post('/hr/employees', employeeData);
    return data;
};

export const updateEmployee = async (empId, updateData) => {
    const { data } = await apiClient.put(`/hr/employees/${empId}`, updateData);
    return data;
};

// Masters
export const getDepartments = async () => {
    const { data } = await apiClient.get('/hr/departments');
    return data;
};

export const createDepartment = async (name) => {
    const { data } = await apiClient.post('/hr/departments', { name });
    return data;
};

export const getDesignations = async () => {
    const { data } = await apiClient.get('/hr/designations');
    return data;
};

export const createDesignation = async (masterData) => {
    const { data } = await apiClient.post('/hr/designations', masterData);
    return data;
};

// Mappings
export const getMappings = async () => {
    const { data } = await apiClient.get('/hr/mappings');
    return data;
};

export const getDesignationsByDept = async (deptId) => {
    const { data } = await apiClient.get(`/hr/departments/${deptId}/designations`);
    return data;
};

export const addMapping = async (mappingData) => {
    const { data } = await apiClient.post('/hr/mappings', mappingData);
    return data;
};

export const removeMapping = async (departmentId, designationId) => {
    const { data } = await apiClient.delete(`/hr/mappings/${departmentId}/${designationId}`);
    return data;
};
