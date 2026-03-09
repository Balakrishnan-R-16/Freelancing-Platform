import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';

const ESCROW_STATES = ['Deposit', 'Funded', 'Work Submitted', 'Approved', 'Completed'];

export default function BlockchainStatus() {
    const { token } = useAuth();
    const { lastEvent } = useRealtime();
    const [myContracts, setMyContracts] = useState([]);
    const [selectedContract, setSelectedContract] = useState(null);
    const [walletConnected, setWalletConnected] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchContracts = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/contracts/my', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();

                // Map the DB statuses to the frontend UI steps
                const mappedContracts = data.map(c => {
                    let step = 0;
                    if (c.status === 'CREATED') step = 0;
                    if (c.status === 'FUNDED') step = 1;
                    if (c.status === 'WORK_SUBMITTED') step = 2;
                    if (c.status === 'APPROVED') step = 3;
                    if (c.status === 'COMPLETED') step = 4;

                    return {
                        ...c,
                        jobTitle: c.job?.title || 'Unknown Job',
                        employer: c.employer?.fullName || 'Unknown Employer',
                        freelancer: c.freelancer?.fullName || 'Unknown Freelancer',
                        currentStep: step,
                        contractAddress: c.contractAddress || '0xPend...ing',
                        txHash: '0xTx...Wait'
                    };
                });

                // Sort newest ID first
                mappedContracts.sort((a, b) => b.id - a.id);

                setMyContracts(mappedContracts);
                if (mappedContracts.length > 0 && !selectedContract) {
                    setSelectedContract(mappedContracts[0]);
                } else if (selectedContract) {
                    // Update the currently selected contract with new data
                    const updated = mappedContracts.find(c => c.id === selectedContract.id);
                    if (updated) setSelectedContract(updated);
                }
            }
        } catch (err) {
            console.error('Failed to fetch contracts', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchContracts();
        }
    }, [token]);

    useEffect(() => {
        if (lastEvent && lastEvent.type && lastEvent.type.startsWith('contract_')) {
            fetchContracts();
        }
    }, [lastEvent]);

    const connectWallet = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                setWalletConnected(true);
            } catch (err) {
                console.error('Wallet connection failed:', err);
            }
        } else {
            alert('Please install MetaMask to use blockchain features');
        }
    };

    return (
        <div className="page-container animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">🔗 Blockchain Payments</h1>
                    <p className="page-subtitle">Track escrow contracts and payment status</p>
                </div>
                <button className={`btn ${walletConnected ? 'btn-success' : 'btn-primary'}`}
                    onClick={connectWallet} id="connect-wallet-btn">
                    {walletConnected ? '🟢 Wallet Connected' : '🦊 Connect MetaMask'}
                </button>
            </div>

            {/* Escrow Flow Visualization */}
            {selectedContract ? (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="card-title" style={{ marginBottom: '1rem' }}>
                        Escrow Flow — {selectedContract.jobTitle}
                    </h3>
                    <div className="escrow-flow">
                        {ESCROW_STATES.map((step, idx) => (
                            <div key={step}
                                className={`escrow-step ${idx === selectedContract.currentStep ? 'active' : ''} ${idx < selectedContract.currentStep ? 'completed' : ''}`}>
                                <div className="step-number">
                                    {idx < selectedContract.currentStep ? '✓' : idx + 1}
                                </div>
                                <h4>{step}</h4>
                                <p>{
                                    idx === 0 ? 'Recruiter deposits' :
                                        idx === 1 ? 'Funds secured' :
                                            idx === 2 ? 'Freelancer delivers' :
                                                idx === 3 ? 'Work approved' :
                                                    'Payment released'
                                }</p>
                            </div>
                        ))}
                    </div>

                    {/* Contract Details */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem', padding: '1.25rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                    }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contract Address</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginTop: '0.25rem' }}>{selectedContract.contractAddress}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)', marginTop: '0.25rem' }}>₹{selectedContract.amount.toLocaleString()}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transaction Hash</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginTop: '0.25rem' }}>{selectedContract.txHash}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</div>
                            <div style={{ marginTop: '0.25rem' }}>
                                <span className={`badge ${selectedContract.status === 'COMPLETED' ? 'badge-completed' :
                                    selectedContract.status === 'FUNDED' ? 'badge-open' : 'badge-progress'
                                    }`}>{selectedContract.status}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {selectedContract.status !== 'COMPLETED' && (
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                            {selectedContract.status === 'CREATED' && (
                                <button className="btn btn-primary">💰 Fund Escrow</button>
                            )}
                            {selectedContract.status === 'FUNDED' && (
                                <button className="btn btn-primary">📤 Submit Work</button>
                            )}
                            {selectedContract.status === 'WORK_SUBMITTED' && (
                                <>
                                    <button className="btn btn-success">✅ Approve & Release</button>
                                    <button className="btn btn-danger">🔄 Request Revision</button>
                                </>
                            )}
                            <button className="btn btn-secondary">📋 View on Etherscan</button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '3rem' }}>
                    {loading ? <p>Loading contracts...</p> : <p>No active escrow contracts found.</p>}
                </div>
            )}

            {/* All Contracts */}
            <div className="card">
                <h3 className="card-title" style={{ marginBottom: '1rem' }}>All Escrow Contracts</h3>
                <table className="data-table" id="contracts-table">
                    <thead>
                        <tr>
                            <th>Project</th>
                            <th>Recruiter</th>
                            <th>Freelancer</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {myContracts.map(contract => (
                            <tr key={contract.id} onClick={() => setSelectedContract(contract)}
                                style={{ cursor: 'pointer', background: selectedContract.id === contract.id ? 'var(--accent-light)' : undefined }}>
                                <td style={{ fontWeight: 600 }}>{contract.jobTitle}</td>
                                <td>{contract.employer}</td>
                                <td>{contract.freelancer}</td>
                                <td style={{ fontWeight: 600, color: 'var(--accent)' }}>₹{contract.amount.toLocaleString()}</td>
                                <td>
                                    <span className={`badge ${contract.status === 'COMPLETED' ? 'badge-completed' :
                                        contract.status === 'FUNDED' ? 'badge-open' : 'badge-progress'
                                        }`}>{contract.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* How It Works */}
            <div style={{
                marginTop: '2rem', padding: '2rem',
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
            }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
                    🔐 How Blockchain Escrow Works
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>1️⃣</div>
                        <strong>Deposit</strong>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Recruiter deposits funds into the smart contract. Funds are locked and secure.
                        </p>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>2️⃣</div>
                        <strong>Work</strong>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Freelancer completes the work and submits it for review.
                        </p>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>3️⃣</div>
                        <strong>Approve</strong>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Recruiter reviews and approves the work on the blockchain.
                        </p>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>4️⃣</div>
                        <strong>Release</strong>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Funds are automatically released to the freelancer's wallet.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
