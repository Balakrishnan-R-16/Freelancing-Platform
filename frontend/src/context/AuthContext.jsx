import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Backend returns "userId" but frontend uses "user.id" — normalize once here
const normalizeUser = (data) => {
    if (!data) return null;
    return {
        ...data,
        id: data.id || data.userId,   // prefer id, fallback to userId
        userId: data.userId || data.id // keep both for compat
    };
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            try { setUser(normalizeUser(JSON.parse(stored))); } catch (e) { /* ignore */ }
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
            const normalized = normalizeUser(data);
            setToken(data.token);
            setUser(normalized);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(normalized));
            return normalized;
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
            const normalized = normalizeUser(data);
            setToken(data.token);
            setUser(normalized);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(normalized));
            return normalized;
        } catch (err) {
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const googleLogin = async (accessToken, role = 'FREELANCER') => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken, role }),
            });
            if (!res.ok) throw new Error('Google Authentication failed');
            const data = await res.json();
            const normalized = normalizeUser(data);
            setToken(data.token);
            setUser(normalized);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(normalized));
            return normalized;
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
        <AuthContext.Provider value={{ user, token, login, register, googleLogin, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

