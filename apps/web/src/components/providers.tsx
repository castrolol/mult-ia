'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Criar QueryClient com configurações otimizadas
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Não refaz automaticamente ao focar a janela
        refetchOnWindowFocus: false,
        // Não refaz ao reconectar
        refetchOnReconnect: false,
        // Tempo que os dados ficam "frescos" (5 minutos)
        staleTime: 5 * 60 * 1000,
        // Tempo que os dados ficam em cache (30 minutos)
        gcTime: 30 * 60 * 1000,
        // Retry apenas 1 vez em caso de erro
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: sempre criar novo cliente
    return makeQueryClient()
  } else {
    // Browser: reutilizar cliente existente
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient()
    }
    return browserQueryClient
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
        enableColorScheme
      >
        {children}
      </NextThemesProvider>
    </QueryClientProvider>
  )
}
