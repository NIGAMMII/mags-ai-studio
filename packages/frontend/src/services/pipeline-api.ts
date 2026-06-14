import { apiClient } from './api-client';
import { Pipeline } from '@/types/pipeline';

export const pipelineApi = {
  createPipeline: async (dto: any): Promise<Pipeline> => {
    const response = await apiClient.post<Pipeline>('/pipelines', dto);
    return response.data;
  },

  getPipeline: async (id: string): Promise<Pipeline> => {
    const response = await apiClient.get<Pipeline>(`/pipelines/${id}`);
    return response.data;
  },

  listPipelines: async (projectId: string): Promise<Pipeline[]> => {
    const response = await apiClient.get<Pipeline[]>(`/pipelines?projectId=${projectId}`);
    return response.data;
  },

  updatePipeline: async (id: string, data: any): Promise<Pipeline> => {
    const response = await apiClient.patch<Pipeline>(`/pipelines/${id}`, data);
    return response.data;
  },

  addStage: async (pipelineId: string, stage: any): Promise<Pipeline> => {
    const response = await apiClient.post<Pipeline>(`/pipelines/${pipelineId}/stages`, stage);
    return response.data;
  },

  removeStage: async (pipelineId: string, stageId: string): Promise<Pipeline> => {
    const response = await apiClient.delete<Pipeline>(`/pipelines/${pipelineId}/stages/${stageId}`);
    return response.data;
  },

  executePipeline: async (id: string, dto?: any): Promise<void> => {
    await apiClient.post(`/pipelines/${id}/execute`, dto || {});
  },
};