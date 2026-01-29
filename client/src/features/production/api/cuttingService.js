import apiClient from '@/lib/apiClient';

const cuttingService = {
    getOrders: async () => {
        const response = await apiClient.get('/cutting/orders');
        return response.data;
    },

    getOrderDetails: async (orderId) => {
        const response = await apiClient.get(`/cutting/orders/${orderId}`);
        return response.data;
    },

    saveCutting: async (orderId, data) => {
        const response = await apiClient.post(`/cutting/orders/${orderId}/cutting`, data);
        return response.data;
    },

    searchOrders: async (searchParams) => {
        const response = await apiClient.get('/cutting/orders/search', { params: searchParams });
        return response.data;
    },
    getRecords: async (filters) => {
        const response = await apiClient.get('/cutting/records', { params: filters });
        return response.data;
    },
    updateCutting: async (id, data) => {
        const response = await apiClient.put(`/cutting/${id}`, data);
        return response.data;
    },
    deleteCutting: async (id) => {
        const response = await apiClient.delete(`/cutting/${id}`);
        return response.data;
    }
};

export default cuttingService;
