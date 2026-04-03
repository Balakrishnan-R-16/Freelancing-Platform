import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import FreelancerDashboard from './pages/FreelancerDashboard';
import EmployerDashboard from './pages/EmployerDashboard';
import Jobs from './pages/Jobs';
import EscrowStatus from './pages/EscrowStatus';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
    return (
        <AuthProvider>
            <RealtimeProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Admin routes — no Navbar */}
                        <Route path="/admin/login" element={<AdminLogin />} />
                        <Route path="/admin/dashboard" element={<AdminDashboard />} />

                        {/* Full-Screen Auth routes */}
                        <Route path="/login" element={<Auth />} />
                        <Route path="/register" element={<Auth />} />

                        {/* Public + User routes — with Navbar */}
                        <Route path="/*" element={
                            <>
                                <Navbar />
                                <Routes>
                                    <Route path="/" element={<Landing />} />
                                    <Route path="/dashboard/freelancer" element={<FreelancerDashboard />} />
                                    <Route path="/dashboard/employer" element={<EmployerDashboard />} />
                                    <Route path="/jobs" element={<Jobs />} />
                                    <Route path="/escrow" element={<EscrowStatus />} />
                                </Routes>
                            </>
                        } />
                    </Routes>
                </BrowserRouter>
            </RealtimeProvider>
        </AuthProvider>
    );
}
