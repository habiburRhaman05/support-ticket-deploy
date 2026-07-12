import { API_ENDPOINTS } from "@/constants"
import axiosInstance from "@/lib/axios"

export interface SubAccountRequest {
  id: string
  ghlLocationId: string
  name: string
  contactEmail: string | null
  status: "PENDING" | "ACTIVE" | "REJECTED"
  requestedAt: string
  decidedAt?: string | null
  rejectionComment?: string | null
  decidedBy?: { name: string } | null
}

export interface BulkApproveResult {
  totalInGhl: number
  activated: number
  skipped: number
}

export const SubAccountsService = {
  async listRequests(): Promise<SubAccountRequest[]> {
    const response = await axiosInstance.get<{ success: boolean; data: SubAccountRequest[] }>(
      API_ENDPOINTS.SUB_ACCOUNTS.REQUESTS,
    )
    return response.data.data
  },

  async listAll(): Promise<SubAccountRequest[]> {
    const response = await axiosInstance.get<{ success: boolean; data: SubAccountRequest[] }>(
      API_ENDPOINTS.SUB_ACCOUNTS.LIST,
    )
    return response.data.data
  },

  async approve(id: string): Promise<SubAccountRequest> {
    const response = await axiosInstance.post<{ success: boolean; data: SubAccountRequest }>(
      API_ENDPOINTS.SUB_ACCOUNTS.APPROVE(id),
    )
    return response.data.data
  },

  async reject(id: string, comment?: string): Promise<SubAccountRequest> {
    const response = await axiosInstance.post<{ success: boolean; data: SubAccountRequest }>(
      API_ENDPOINTS.SUB_ACCOUNTS.REJECT(id),
      { comment },
    )
    return response.data.data
  },

  async bulkApprove(): Promise<BulkApproveResult> {
    const response = await axiosInstance.post<{ success: boolean; data: BulkApproveResult }>(
      API_ENDPOINTS.SUB_ACCOUNTS.BULK_APPROVE,
    )
    return response.data.data
  },
}
