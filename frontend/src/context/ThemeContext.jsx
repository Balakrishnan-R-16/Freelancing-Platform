// ThemeContext — stripped. Single fixed dark theme. No switching.
import React, { createContext, useContext } from 'react';

const ThemeContext = createContext({ theme: 'dark' });

// Pass-through provider — keeps App.jsx import working without changes
export const ThemeProvider = ({ children }) => (
    <ThemeContext.Provider value={{ theme: 'dark' }}>
        {children}
    </ThemeContext.Provider>
);

// No-op hook — kept so any consumer doesn't crash
export const useTheme = () => useContext(ThemeContext);
