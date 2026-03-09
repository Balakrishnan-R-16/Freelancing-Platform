import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { RealtimeProvider } from './context/RealtimeContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import FreelancerDashboard from './pages/FreelancerDashboard';
import EmployerDashboard from './pages/EmployerDashboard';
import Jobs from './pages/Jobs';
import BlockchainStatus from './pages/BlockchainStatus';

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <RealtimeProvider>
                    <BrowserRouter>
                        <Navbar />
                        <Routes>
                            <Route path="/" element={<Landing />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/dashboard/freelancer" element={<FreelancerDashboard />} />
                            <Route path="/dashboard/employer" element={<EmployerDashboard />} />
                            <Route path="/jobs" element={<Jobs />} />
                            <Route path="/blockchain" element={<BlockchainStatus />} />
                        </Routes>
                    </BrowserRouter>
                </RealtimeProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
