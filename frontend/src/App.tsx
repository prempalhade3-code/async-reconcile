import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { TicketsPage } from './pages/TicketsPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { OperationsPage } from './pages/OperationsPage';
import { OperationDetailPage } from './pages/OperationDetailPage';
import { BenchmarkRunsPage } from './pages/BenchmarkRunsPage';
import { EventsPage } from './pages/EventsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
          <Route path="operations" element={<OperationsPage />} />
          <Route path="operations/:id" element={<OperationDetailPage />} />
          <Route path="benchmark" element={<BenchmarkRunsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
