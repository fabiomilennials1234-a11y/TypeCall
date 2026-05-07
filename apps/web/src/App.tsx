import { Routes, Route } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ProtectedRoute, PublicRoute } from '@/contexts/auth'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
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
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/forms" element={<FormsPage />} />
          <Route path="/forms/:id" element={<FormDetailPage />} />
          <Route path="/forms/:id/builder" element={<FormBuilderPage />} />
          <Route path="/forms/:id/responses" element={<ResponsesPage />} />
          <Route path="/forms/:id/responses/:responseId" element={<ResponseDetailPage />} />
          <Route path="/scheduling" element={<EventTypesPage />} />
          <Route path="/scheduling/:eventTypeId" element={<EventTypeDetailPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/webhooks" element={<WebhooksPage />} />
          <Route path="/embed" element={<EmbedPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
