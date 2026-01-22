import apiClient from '@/lib/apiClient';

export const getOrders = async () => {
    const { data } = await apiClient.get('/it/orders');
    return data.data;
};

export const getOrderDetails = async (id) => {
    const { data } = await apiClient.get(`/it/orders/${id}`);
    return data.data;
};

export const createOrder = async (orderData) => {
    const { data } = await apiClient.post('/it/orders', orderData);
    return data;
};

export const updateOrder = async (id, orderData) => {
    const { data } = await apiClient.put(`/it/orders/${id}`, orderData);
    return data;
};

export const deleteOrder = async (id) => {
    const { data } = await apiClient.delete(`/it/orders/${id}`);
    return data;
};

// --- Masters ---

export const getAgeGroups = async () => {
    const { data } = await apiClient.get('/it/masters/agelists');
    return data.data;
};

export const createAgeGroup = async (name, age) => {
    const { data } = await apiClient.post('/it/masters/agelists', { name, age });
    return data.data;
};

export const getCategories = async () => {
    const { data } = await apiClient.get('/it/masters/categories');
    return data.data;
};

export const createCategory = async (name) => {
    const { data } = await apiClient.post('/it/masters/categories', { name });
    return data.data;
};

export const getSizeCategories = async () => {
    const { data } = await apiClient.get('/it/masters/size-categories');
    return data.data;
};

export const createSizeCategory = async (name, sizes) => {
    const { data } = await apiClient.post('/it/masters/size-categories', { name, sizes });
    return data.data;
};

export const appendSizesToCategory = async (id, sizes) => {
    const { data } = await apiClient.put(`/it/masters/size-categories/${id}/sizes`, { sizes });
    return data.data;
};

export const createStyle = async (id, name, brand) => {
    const { data } = await apiClient.post('/it/masters/styles', { id, name, brand });
    return data.data;
};

export const getStyles = async () => {
    const { data } = await apiClient.get('/it/masters/styles');
    return data.data;
};

export const getColors = async (styleId) => {
    if (!styleId) return [];
    const { data } = await apiClient.get(`/it/masters/colours?styleId=${styleId}`);
    return data.data;
};

export const createColor = async (styleId, name, code) => {
    const { data } = await apiClient.post('/it/masters/colours', { styleId, name, code });
    return data.data;
};
