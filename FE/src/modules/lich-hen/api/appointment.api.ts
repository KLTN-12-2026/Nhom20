import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type {
  Appointment,
  AppointmentQuery,
  AppointmentStats,
  AppointmentUpdatePayload,
  GuestAppointmentPayload,
} from '../types/appointment.types';

export interface CreatePatientAppointmentPayload {
  specialtyId: number;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
  note?: string;
}

interface AppointmentListData {
  items: Appointment[];
  stats: AppointmentStats;
}

export const appointmentApi = {
  async createPatient(payload: CreatePatientAppointmentPayload) {
    const response = await axiosClient.post<ApiResponse<Appointment>>(
      '/appointments/patient',
      payload,
    );
    return response.data;
  },
  async createGuest(payload: GuestAppointmentPayload) {
    const response = await axiosClient.post<ApiResponse<Appointment>>(
      '/appointments/guest',
      payload,
    );
    return response.data;
  },

  async getAll(query: AppointmentQuery = {}) {
    const response = await axiosClient.get<ApiResponse<AppointmentListData>>(
      '/appointments',
      { params: query },
    );
    return response.data;
  },

  async getDoctorAppointments(query: AppointmentQuery = {}) {
    const response = await axiosClient.get<ApiResponse<AppointmentListData>>(
      '/appointments/doctor/me',
      { params: query },
    );
    return response.data;
  },

  async create(payload: GuestAppointmentPayload) {
    const response = await axiosClient.post<ApiResponse<Appointment>>(
      '/appointments',
      payload,
    );
    return response.data;
  },

  async update(id: number, payload: AppointmentUpdatePayload) {
    const response = await axiosClient.patch<ApiResponse<Appointment>>(
      `/appointments/${id}`,
      payload,
    );
    return response.data;
  },

  async checkIn(id: number) {
    const response = await axiosClient.post<ApiResponse<Appointment>>(
      `/appointments/${id}/check-in`,
    );
    return response.data;
  },

  async remove(id: number) {
    const response = await axiosClient.delete<ApiResponse<{ id: number }>>(
      `/appointments/${id}`,
    );
    return response.data;
  },
};
