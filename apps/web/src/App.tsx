import { Routes, Route } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ProtectedRoute, PublicRoute } from '@/contexts/auth'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { SalesDashboard } from '@/features/analytics/SalesDashboard'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { FormsPage } from '@/features/forms/FormsPage'
import { FormDetailPage } from '@/features/forms/FormDetailPage'
import { FormBuilderPage } from '@/features/builder/FormBuilderPage'
import { FormRunnerPage } from '@/features/runner/FormRunnerPage'
import { ResponsesPage } from '@/features/responses/ResponsesPage'
import { ResponseDetailPage } from '@/features/responses/ResponseDetailPage'
import { EventTypesPage } from '@/features/scheduling/EventTypesPage'
import { EventTypeDetailPage } from '@/features/scheduling/EventTypeDetailPage'
import { BookingsPage } from '@/features/scheduling/BookingsPage'
import { WebhooksPage } from '@/features/webhooks/WebhooksPage'
import { EmbedPage } from '@/features/embed/EmbedPage'
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage'
import { IntegrationsPage } from '@/features/settings/IntegrationsPage'
import { QualificationRulesPage } from '@/features/qualification/QualificationRulesPage'
import { SellersPage } from '@/features/sellers/SellersPage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { RequireRole } from '@/hooks/useRequireRole'
import { NotFoundPage } from '@/features/not-found/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route path="/f/:slug" element={<FormRunnerPage />} />
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ErrorBoundary><ProtectedRoute /></ErrorBoundary>}>
        <Route element={<RequireRole allowed={['admin', 'master']} />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route path="/" element={<SalesDashboard />} />
          <Route path="/dashboard-old" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/forms" element={<FormsPage />} />
          <Route path="/forms/:id" element={<FormDetailPage />} />
          <Route path="/forms/:id/builder" element={<FormBuilderPage />} />
          <Route path="/forms/:id/responses" element={<ResponsesPage />} />
          <Route path="/forms/:id/responses/:responseId" element={<ResponseDetailPage />} />
          <Route path="/forms/:id/qualification" element={<QualificationRulesPage />} />
          <Route element={<RequireRole allowed={['admin', 'master']} />}>
            <Route path="/sellers" element={<SellersPage />} />
          </Route>
          <Route path="/scheduling" element={<EventTypesPage />} />
          <Route path="/scheduling/:eventTypeId" element={<EventTypeDetailPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/webhooks" element={<WebhooksPage />} />
          <Route path="/embed" element={<EmbedPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings/integrations" element={<IntegrationsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
