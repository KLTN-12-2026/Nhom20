/**
 * Standard API response wrapper from the backend.
 * All endpoints return this shape.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<{ items: T[] }> {}
