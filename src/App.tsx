import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingDots from './components/LoadingDots'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import ToastContainer from './components/ToastContainer'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const BandejaPage = lazy(() => import('./pages/BandejaPage'))
const UploadPage = lazy(() => import('./pages/UploadPage'))
const PreliquidacionPage = lazy(() => import('./pages/PreliquidacionPage'))
const BackupPage = lazy(() => import('./pages/BackupPage'))

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <LoadingDots />
    </div>
  )
}

function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

function PublicRoute() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/chat" replace />
  return <Outlet />
}

const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [{
      path: '/login',
      element: (
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <LoginPage />
          </Suspense>
        </ErrorBoundary>
      ),
    }],
  },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <Layout />,
      children: [
        {
          path: '/chat',
          element: (
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                <ChatPage />
              </Suspense>
            </ErrorBoundary>
          ),
        },
        {
          path: '/bandeja',
          element: (
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                <BandejaPage />
              </Suspense>
            </ErrorBoundary>
          ),
        },
        {
          path: '/upload',
          element: (
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                <UploadPage />
              </Suspense>
            </ErrorBoundary>
          ),
        },
        {
          path: '/preliquidacion',
          element: (
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                <PreliquidacionPage />
              </Suspense>
            </ErrorBoundary>
          ),
        },
        {
          path: '/backup',
          element: (
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                <BackupPage />
              </Suspense>
            </ErrorBoundary>
          ),
        },
      ],
    }],
  },
  {
    path: '*',
    element: <Navigate to="/chat" replace />,
  },
])

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <RouterProvider router={router} />
          <ToastContainer />
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
