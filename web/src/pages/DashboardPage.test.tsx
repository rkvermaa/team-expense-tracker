import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'
import * as authApi from '../api/auth'

vi.mock('../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/auth')>()),
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
}))

function renderDashboard() {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<div>login probe</div>} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authApi.me).mockResolvedValue({ id: 'u1', email: 'a@b.co', role: 'member' })
  })

  it("greets the logged-in user with their email", async () => {
    renderDashboard()

    expect(await screen.findByText(/a@b\.co/)).toBeInTheDocument()
  })

  it('logs out via the API and navigates to /login', async () => {
    vi.mocked(authApi.logout).mockResolvedValue()
    renderDashboard()

    await userEvent.click(await screen.findByRole('button', { name: /log out/i }))

    expect(authApi.logout).toHaveBeenCalledOnce()
    expect(await screen.findByText('login probe')).toBeInTheDocument()
  })
})
