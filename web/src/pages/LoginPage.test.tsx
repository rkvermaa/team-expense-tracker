import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LoginPage } from './LoginPage'
import * as authApi from '../api/auth'

vi.mock('../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/auth')>()),
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
}))

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>dashboard probe</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders labeled email and password inputs and a submit button', () => {
    renderLogin()

    const email = screen.getByLabelText(/email/i)
    expect(email).toHaveAttribute('type', 'email')
    const password = screen.getByLabelText(/password/i)
    expect(password).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('submits the entered credentials to the login API', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ id: 'u1', email: 'a@b.co', role: 'member' })
    renderLogin()

    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/password/i), 'my-entered-value')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(authApi.login).toHaveBeenCalledWith('a@b.co', 'my-entered-value')
  })

  it('navigates to /dashboard on successful login', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ id: 'u1', email: 'a@b.co', role: 'member' })
    renderLogin()

    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/password/i), 'my-entered-value')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText('dashboard probe')).toBeInTheDocument()
  })

  it('shows the server error, stays on the form, and clears the password on 401', async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new authApi.ApiError('Invalid email or password', 401),
    )
    renderLogin()

    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-guess')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
    expect(screen.queryByText('dashboard probe')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toHaveValue('')
  })
})
