import { createContext, useContext, useEffect, useState } from 'react';

const RealtimeContext = createContext({
    events: [],
    lastEvent: null
});

export const RealtimeProvider = ({ children }) => {
    const [events, setEvents] = useState([]);
    const [lastEvent, setLastEvent] = useState(null);

    useEffect(() => {
        let eventSource;
        let reconnectDelay = 3000;
        let reconnectTimer;
        const maxDelay = 30000;

        const connect = () => {
            eventSource = new EventSource('/api/events/stream');

            eventSource.onopen = () => {
                console.log('SSE Connected');
                reconnectDelay = 3000; // Reset delay on successful connect
            };

            const handleEvent = (e) => {
                const eventName = e.type;
                try {
                    const data = JSON.parse(e.data);
                    const payload = { type: eventName, data, timestamp: new Date() };
                    setEvents(prev => [payload, ...prev].slice(0, 50));
                    setLastEvent(payload);
                    window.dispatchEvent(new CustomEvent('realtime-event', { detail: payload }));
                } catch (err) {
                    console.warn('SSE parse error:', err);
                }
            };

            const eventNames = [
                'job_created', 'job_updated', 'job_deleted',
                'bid_created', 'bid_accepted', 'bid_rejected',
                'contract_created', 'contract_updated'
            ];

            eventNames.forEach(evt => {
                eventSource.addEventListener(evt, handleEvent);
            });

            eventSource.onerror = () => {
                eventSource.close();
                // Exponential backoff: 3s → 6s → 12s → ... → max 30s
                reconnectTimer = setTimeout(connect, reconnectDelay);
                reconnectDelay = Math.min(reconnectDelay * 2, maxDelay);
            };
        };

        connect();

        return () => {
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (eventSource) eventSource.close();
        };
    }, []);

    return (
        <RealtimeContext.Provider value={{ events, lastEvent }}>
            {children}
        </RealtimeContext.Provider>
    );
};

export const useRealtime = () => useContext(RealtimeContext);
