import apiClient from '@/lib/apiClient';

export const login = async (credentials) => {
    const { data } = await apiClient.post('/auth/login', credentials);
    return data;
};

export const register = async (userData) => {
    const { data } = await apiClient.post('/auth/register', userData);
    return data;
};

export const fetchMe = async () => {
    const { data } = await apiClient.get('/auth/me');
    return data;
};
