import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './RequireAuth'
import * as authApi from '../api/auth'

vi.mock('../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/auth')>()),
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
}))

function renderGuarded() {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<div>login probe</div>} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <div>protected content</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /login when the session probe returns 401', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new authApi.ApiError('Unauthorized', 401))
    renderGuarded()

    expect(await screen.findByText('login probe')).toBeInTheDocument()
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
  })

  it('renders the wrapped route when the session probe returns a user', async () => {
    vi.mocked(authApi.me).mockResolvedValue({ id: 'u1', email: 'a@b.co', role: 'member' })
    renderGuarded()

    expect(await screen.findByText('protected content')).toBeInTheDocument()
  })
})
