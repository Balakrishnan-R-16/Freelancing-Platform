import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            try { setUser(JSON.parse(stored)); } catch (e) { /* ignore */ }
        }
    }, []);

    const API = '/api/auth';

    const login = async (email, password) => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (!res.ok) throw new Error('Invalid credentials');
            const data = await res.json();
            setToken(data.token);
            setUser(data);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            return data;
        } catch (err) {
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const register = async (email, password, fullName, role, walletAddress) => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, fullName, role, walletAddress }),
            });
            if (!res.ok) throw new Error('Registration failed');
            const data = await res.json();
            setToken(data.token);
            setUser(data);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            return data;
        } catch (err) {
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
