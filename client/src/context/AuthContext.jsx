import { createContext, useContext, useState, useEffect } from 'react';
import * as authAPI from '@/features/auth/api/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if token exists
        const token = localStorage.getItem('token');
        if (token) {
            authAPI.fetchMe()
                .then((response) => setUser(response.user))
                .catch(() => {
                    localStorage.removeItem('token');
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (credentials) => {
        const { data } = await authAPI.login(credentials);
        localStorage.setItem('token', data.token);
        setUser(data.user);
    };

    const register = async (userData) => {
        await authAPI.register(userData);
        // Auto login or redirect logic handled by component
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
