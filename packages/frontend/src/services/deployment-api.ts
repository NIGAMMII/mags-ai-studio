import { apiClient } from './api-client';
import { Deployment } from '@/types/deployment';

export const deploymentApi = {
  createDeployment: async (dto: any): Promise<Deployment> => {
    const response = await apiClient.post<Deployment>('/deployments', dto);
    return response.data;
  },

  getDeployment: async (id: string): Promise<Deployment> => {
    const response = await apiClient.get<Deployment>(`/deployments/${id}`);
    return response.data;
  },

  listDeployments: async (projectId: string): Promise<Deployment[]> => {
    const response = await apiClient.get<Deployment[]>(`/deployments/project/${projectId}`);
    return response.data;
  },

  runDeployment: async (id: string, dto?: any): Promise<void> => {
    await apiClient.post(`/deployments/${id}/run`, dto || {});
  },

  rollbackDeployment: async (id: string): Promise<void> => {
    await apiClient.post(`/deployments/${id}/rollback`);
  },
};