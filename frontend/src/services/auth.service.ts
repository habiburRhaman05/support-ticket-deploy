import { API_ENDPOINTS } from "@/constants"
import axiosInstance from "@/lib/axios"
import type { AuthResponse, User } from "@/types"

export const AuthService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await axiosInstance.post<{ success: boolean; data: AuthResponse }>(
      API_ENDPOINTS.AUTH.LOGIN,
      { email, password },
    )
    return response.data.data
  },

  /** First-time agency owner connect — validates the GHL key server-side. */
  async connect(params: {
    agencyName: string
    email: string
    password: string
    ghlCompanyId: string
    ghlApiKey: string
  }): Promise<AuthResponse> {
    const response = await axiosInstance.post<{ success: boolean; data: AuthResponse }>(
      API_ENDPOINTS.AUTH.CONNECT,
      params,
    )
    return response.data.data
  },

  async getMe(): Promise<User> {
    const response = await axiosInstance.get<{ success: boolean; data: User }>(
      API_ENDPOINTS.AUTH.ME,
    )
    return response.data.data
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await axiosInstance.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
    })
  },

  /** First-login password set for a team member on a temporary password. */
  async firstLoginPassword(newPassword: string): Promise<void> {
    await axiosInstance.post(API_ENDPOINTS.AUTH.FIRST_LOGIN_PASSWORD, { newPassword })
  },
}
