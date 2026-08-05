import { QueryClientProvider } from '@tanstack/react-query'
import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { PublicOnly, RequireEstablishment, RequireOnboarding } from '@/features/auth/guards'
import { TenancyProvider } from '@/features/tenancy/TenancyProvider'
import { queryClient } from '@/lib/queryClient'
import { Alerts } from '@/routes/Alerts'
import { Overview } from '@/routes/Overview'
import { Login } from '@/routes/Login'
import { ManualProduct } from '@/routes/ManualProduct'
import { Onboarding } from '@/routes/Onboarding'
import { OrderDetail } from '@/routes/OrderDetail'
import { Orders } from '@/routes/Orders'
import { Settings } from '@/routes/Settings'
import { Splash } from '@/routes/Splash'
import { Stock } from '@/routes/Stock'
import { Welcome } from '@/routes/Welcome'

// ZXing pèse lourd et ne sert que sur cet écran : on le charge à la demande
// pour que l'app démarre vite sur un téléphone de cuisine.
const Scan = lazy(() => import('@/routes/Scan').then((m) => ({ default: m.Scan })))

// La vitrine n'a rien à faire dans le bundle de l'app : elle est publique et
// ne sert qu'une fois, avant l'inscription.
const Landing = lazy(() =>
  import('@/routes/Landing').then((m) => ({ default: m.Landing })),
)

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TenancyProvider>
            <Routes>
              <Route
                path="/presentation"
                element={
                  <Suspense fallback={<Splash />}>
                    <Landing />
                  </Suspense>
                }
              />
              <Route
                path="/bienvenue"
                element={
                  <PublicOnly>
                    <Welcome />
                  </PublicOnly>
                }
              />
              <Route
                path="/connexion"
                element={
                  <PublicOnly>
                    <Login />
                  </PublicOnly>
                }
              />
              <Route
                path="/onboarding"
                element={
                  <RequireOnboarding>
                    <Onboarding />
                  </RequireOnboarding>
                }
              />

              <Route element={<RequireEstablishment />}>
                {/* Plein écran : hors coquille, sans barre de nav. */}
                <Route
                  path="/scan"
                  element={
                    <Suspense fallback={<Splash />}>
                      <Scan />
                    </Suspense>
                  }
                />
                <Route path="/produit/nouveau" element={<ManualProduct />} />

                <Route element={<AppShell />}>
                  <Route index element={<Overview />} />
                  <Route path="/stock" element={<Stock />} />
                  <Route path="/alertes" element={<Alerts />} />
                  <Route path="/commandes" element={<Orders />} />
                  <Route path="/commandes/:id" element={<OrderDetail />} />
                  <Route path="/reglages" element={<Settings />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </TenancyProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
