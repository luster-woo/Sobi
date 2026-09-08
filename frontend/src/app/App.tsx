import { RouterProvider } from 'react-router'

import { QueryProvider } from '@/app/providers/QueryProvider'
import { router } from '@/app/routes/router'
import ToastViewport from '@/shared/ui/ToastViewport'

function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
      <ToastViewport />
    </QueryProvider>
  )
}

export default App
