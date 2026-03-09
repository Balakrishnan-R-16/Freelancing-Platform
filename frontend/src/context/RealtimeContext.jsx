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
        const connect = () => {
            eventSource = new EventSource('/api/events/stream');

            eventSource.onopen = () => {
                console.log('SSE Component Connected');
            };

            // Setup a generic message listener or catch-all. 
            // In Spring, when sending with name(X), event types are named. 
            // The EventSource API listens to named events independently or uses addEventListener.
            // Since we don't know all event names easily, we can add a few common ones.
            const handleEvent = (e) => {
                const eventName = e.type;
                const data = JSON.parse(e.data);
                const payload = { type: eventName, data, timestamp: new Date() };

                setEvents(prev => [payload, ...prev].slice(0, 50)); // Keep last 50 events
                setLastEvent(payload);

                // optionally dispatch a global DOM event so components can do window.addEventListener('realtime-event')
                window.dispatchEvent(new CustomEvent('realtime-event', { detail: payload }));
            };

            // Register known event types that the backend dispatches
            const eventNames = [
                'job_created', 'job_updated', 'job_deleted',
                'bid_created', 'bid_accepted', 'bid_rejected',
                'contract_created', 'contract_updated'
            ];

            eventNames.forEach(evt => {
                eventSource.addEventListener(evt, handleEvent);
            });

            eventSource.onerror = (e) => {
                console.error('SSE Error:', e);
                eventSource.close();
                // Reconnect after 3 seconds
                setTimeout(connect, 3000);
            };
        };

        connect();

        return () => {
            if (eventSource) {
                eventSource.close();
            }
        };
    }, []);

    return (
        <RealtimeContext.Provider value={{ events, lastEvent }}>
            {children}
        </RealtimeContext.Provider>
    );
};

export const useRealtime = () => useContext(RealtimeContext);
