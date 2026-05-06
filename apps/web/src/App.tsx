import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ProtectedRoute, PublicRoute } from '@/contexts/auth'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { FormsPage } from '@/features/forms/FormsPage'
import { FormDetailPage } from '@/features/forms/FormDetailPage'
import { FormBuilderPage } from '@/features/builder/FormBuilderPage'
import { FormRunnerPage } from '@/features/runner/FormRunnerPage'
import { ResponsesPage } from '@/features/responses/ResponsesPage'
import { ResponseDetailPage } from '@/features/responses/ResponseDetailPage'

export default function App() {
  return (
    <Routes>
      <Route path="/f/:slug" element={<FormRunnerPage />} />
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/forms" element={<FormsPage />} />
          <Route path="/forms/:id" element={<FormDetailPage />} />
          <Route path="/forms/:id/builder" element={<FormBuilderPage />} />
          <Route path="/forms/:id/responses" element={<ResponsesPage />} />
          <Route path="/forms/:id/responses/:responseId" element={<ResponseDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
