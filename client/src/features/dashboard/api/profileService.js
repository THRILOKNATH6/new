import apiClient from '@/lib/apiClient';

export const getProfile = async () => {
    const { data } = await apiClient.get('/profile');
    return data;
};

export const updateProfile = async (profileData) => {
    const { data } = await apiClient.put('/profile', profileData);
    return data;
};

export const updateAvatar = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);

    // Axios allows FormData and sets Content-Type header automatically to multipart/form-data
    const { data } = await apiClient.post('/profile/avatar', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return data;
};
