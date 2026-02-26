import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import Calendar from './pages/Calendar';
import Contacts from './pages/Contacts';
import ContactDetail from './pages/ContactDetail';
import RecoverySeekers from './pages/RecoverySeekers';
import RecoverySeekersList from './pages/RecoverySeekersList';
import SeekerDetail from './pages/SeekerDetail';
import Tasks from './pages/Tasks';
import WorkshopTracker from './pages/WorkshopTracker';
import WorkshopDetail from './pages/WorkshopDetail';
import PreventionResources from './pages/PreventionResources';
import RecoveryResources from './pages/RecoveryResources';
import Invoices from './pages/Invoices';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Contracts from './pages/Contracts';
import ContractDetail from './pages/ContractDetail';
import StaffHub from './pages/StaffHub';
import MeetingNotes from './pages/MeetingNotes';
import MeetingNoteDetail from './pages/MeetingNoteDetail';
import Settings from './pages/Settings';
import Surveys from './pages/Surveys';
import SurveyBuilder from './pages/SurveyBuilder';
import PublicSurvey from './pages/PublicSurvey';
import { Loader2 } from 'lucide-react';

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <Loader2 className="app-loading-spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/survey/:token" element={<PublicSurvey />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <DataProvider>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        {/* Public survey — no auth or layout required */}
        <Route path="/survey/:token" element={<PublicSurvey />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          {/* Core */}
          <Route path="calendar" element={<Calendar />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="contacts/:id" element={<ContactDetail />} />
          <Route path="companies" element={<Companies />} />
          <Route path="companies/:id" element={<CompanyDetail />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="meeting-notes" element={<MeetingNotes />} />
          <Route path="meeting-notes/:id" element={<MeetingNoteDetail />} />
          {/* Prevention */}
          <Route path="workshop-tracker" element={<WorkshopTracker />} />
          <Route path="workshops/:id" element={<WorkshopDetail />} />
          <Route path="prevention/resources" element={<PreventionResources />} />
          <Route path="prevention/invoices" element={<Invoices category="Prevention" />} />
          <Route path="prevention/surveys" element={<Surveys type="prevention" />} />
          <Route path="prevention/surveys/new" element={<SurveyBuilder />} />
          <Route path="prevention/surveys/:id/edit" element={<SurveyBuilder />} />
          {/* Recovery */}
          <Route path="recovery-seekers" element={<RecoverySeekersList />} />
          <Route path="treatment-tracker" element={<RecoverySeekers />} />
          <Route path="recovery/resources" element={<RecoveryResources />} />
          <Route path="recovery/invoices" element={<Invoices category="Recovery" />} />
          <Route path="recovery/surveys" element={<Surveys type="recovery" />} />
          <Route path="recovery/surveys/new" element={<SurveyBuilder />} />
          <Route path="recovery/surveys/:id/edit" element={<SurveyBuilder />} />
          {/* Operations */}
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/:id" element={<ContractDetail />} />
          <Route path="staff-hub" element={<StaffHub />} />
          {/* Settings */}
          <Route path="settings" element={<Settings />} />
          {/* Legacy routes */}
          <Route path="recovery-seekers/:id" element={<SeekerDetail />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
