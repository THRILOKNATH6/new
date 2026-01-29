import apiClient from '../../../lib/apiClient';

const supermarketService = {
    getDashboard: () => apiClient.get('/loading/dashboard'),
    getLines: () => apiClient.get('/loading/lines'),
    getBundles: (orderId) => apiClient.get(`/loading/bundles/${orderId}`),
    searchOrders: (params) => apiClient.get('/loading/orders/search', { params }),
    verifyEmployee: (empId) => apiClient.get(`/loading/verify-employee/${empId}`),
    getRecommendation: (lineNo) => apiClient.get(`/loading/recommendation/${lineNo}`),
    createTransaction: (data) => apiClient.post('/loading/transactions', data),
    approveTransaction: (id, category, approverId) => apiClient.post(`/loading/transactions/${id}/approve`, { categoryName: category, approverId }),
    rejectTransaction: (id, category) => apiClient.post(`/loading/transactions/${id}/reject`, { categoryName: category }),
    handoverTransaction: (id, category, handoverId, variantStyleId) => apiClient.post(`/loading/transactions/${id}/handover`, { categoryName: category, handoverId, variantStyleId }),
};

export default supermarketService;
