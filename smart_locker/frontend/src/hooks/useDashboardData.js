import React from 'react';
import { apiRequest, authHeaders } from '../services/apiClient';

export function useDashboardData(token, user) {
  const [stations, setStations] = React.useState([]);
  const [selectedStationId, setSelectedStationId] = React.useState('');
  const [lockers, setLockers] = React.useState([]);
  const [requests, setRequests] = React.useState([]);
  const [queueEntries, setQueueEntries] = React.useState([]);
  const [events, setEvents] = React.useState([]);
  const [overdueLockers, setOverdueLockers] = React.useState([]);

  const headers = React.useMemo(() => authHeaders(token), [token]);

  const load = React.useCallback(async () => {
    if (!token || !user) {
      return;
    }

    const path = selectedStationId ? `/dashboard?stationId=${selectedStationId}` : '/dashboard';
    const response = await apiRequest(path, { headers });

    setStations(response.stations || []);
    setRequests(response.requests || []);
    setEvents(response.events || []);
    setLockers(response.lockers || []);
    setQueueEntries(response.queueEntries || []);
    setOverdueLockers(response.overdueLockers || []);

    const stationList = response.stations || [];
    if (!selectedStationId && response.selectedStationId) {
      setSelectedStationId(response.selectedStationId);
    } else if (selectedStationId) {
      const stillExists = stationList.some((station) => station._id === selectedStationId);
      if (!stillExists && stationList.length > 0) {
        setSelectedStationId(stationList[0]._id);
      }
    }
  }, [headers, selectedStationId, token, user]);

  React.useEffect(() => {
    if (!token || !user) {
      return;
    }

    const intervalId = window.setInterval(() => {
      load().catch(() => { });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [token, user, load]);

  return {
    stations,
    selectedStationId,
    setSelectedStationId,
    lockers,
    requests,
    queueEntries,
    events,
    overdueLockers,
    load
  };
}
