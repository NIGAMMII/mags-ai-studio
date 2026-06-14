'use client';
import { create } from 'zustand';
import { Pipeline, PipelineStage } from '@/types/pipeline';
import { pipelineApi } from '@/services/pipeline-api';

interface PipelineStore {
  pipelines: Pipeline[];
  currentPipeline: Pipeline | null;
  isLoading: boolean;
  error: string | null;

  fetchPipelines: (projectId: string) => Promise<void>;
  getPipeline: (id: string) => Promise<void>;
  createPipeline: (data: any) => Promise<void>;
  updatePipeline: (id: string, data: any) => Promise<void>;
  addStage: (pipelineId: string, stage: PipelineStage) => Promise<void>;
  removeStage: (pipelineId: string, stageId: string) => Promise<void>;
  executePipeline: (id: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const usePipelineStore = create<PipelineStore>((set) => ({
  pipelines: [],
  currentPipeline: null,
  isLoading: false,
  error: null,

  fetchPipelines: async (projectId: string) => {
    set({ isLoading: true });
    try {
      const pipelines = await pipelineApi.listPipelines(projectId);
      set({ pipelines });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  getPipeline: async (id: string) => {
    set({ isLoading: true });
    try {
      const pipeline = await pipelineApi.getPipeline(id);
      set({ currentPipeline: pipeline });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  createPipeline: async (data: any) => {
    set({ isLoading: true });
    try {
      const pipeline = await pipelineApi.createPipeline(data);
      set((state) => ({
        pipelines: [pipeline, ...state.pipelines],
        currentPipeline: pipeline,
      }));
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  updatePipeline: async (id: string, data: any) => {
    try {
      const pipeline = await pipelineApi.updatePipeline(id, data);
      set((state) => ({
        pipelines: state.pipelines.map((p) => (p.id === id ? pipeline : p)),
        currentPipeline: state.currentPipeline?.id === id ? pipeline : state.currentPipeline,
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  addStage: async (pipelineId: string, stage: PipelineStage) => {
    try {
      const updated = await pipelineApi.addStage(pipelineId, stage);
      set((state) => ({
        currentPipeline: state.currentPipeline?.id === pipelineId ? updated : state.currentPipeline,
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  removeStage: async (pipelineId: string, stageId: string) => {
    try {
      const updated = await pipelineApi.removeStage(pipelineId, stageId);
      set((state) => ({
        currentPipeline: state.currentPipeline?.id === pipelineId ? updated : state.currentPipeline,
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  executePipeline: async (id: string) => {
    try {
      await pipelineApi.executePipeline(id);
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));