'use client';
import { create } from 'zustand';
import { Deployment, DeploymentLog, DeploymentMetric } from '@/types/deployment';
import { deploymentApi } from '@/services/deployment-api';
import { io, Socket } from 'socket.io-client';

interface DeploymentStore {
  deployments: Deployment[];
  currentDeployment: Deployment | null;
  logs: DeploymentLog[];
  metrics: DeploymentMetric[];
  isLoading: boolean;
  error: string | null;
  socket: Socket | null;

  fetchDeployments: (projectId: string) => Promise<void>;
  getDeployment: (id: string) => Promise<void>;
  createDeployment: (data: any) => Promise<void>;
  runDeployment: (id: string) => Promise<void>;
  rollbackDeployment: (id: string) => Promise<void>;
  subscribeToDeployment: (id: string) => void;
  unsubscribeFromDeployment: (id: string) => void;
  setError: (error: string | null) => void;
}

export const useDeploymentStore = create<DeploymentStore>((set, get) => ({
  deployments: [],
  currentDeployment: null,
  logs: [],
  metrics: [],
  isLoading: false,
  error: null,
  socket: null,

  fetchDeployments: async (projectId: string) => {
    set({ isLoading: true });
    try {
      const deployments = await deploymentApi.listDeployments(projectId);
      set({ deployments });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  getDeployment: async (id: string) => {
    set({ isLoading: true });
    try {
      const deployment = await deploymentApi.getDeployment(id);
      set({ currentDeployment: deployment });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  createDeployment: async (data: any) => {
    set({ isLoading: true });
    try {
      const deployment = await deploymentApi.createDeployment(data);
      set((state) => ({
        deployments: [deployment, ...state.deployments],
        currentDeployment: deployment,
      }));
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  runDeployment: async (id: string) => {
    try {
      await deploymentApi.runDeployment(id);
      // Deployment status will be updated via WebSocket
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  rollbackDeployment: async (id: string) => {
    try {
      await deploymentApi.rollbackDeployment(id);
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  subscribeToDeployment: (id: string) => {
    const socket = get().socket || io(`${process.env.NEXT_PUBLIC_API_URL}/devops`);
    socket.emit('subscribe-deployment', id);

    socket.on('deployment-update', (data) => {
      set({ currentDeployment: data });
    });

    socket.on('build-log', (log) => {
      set((state) => ({
        logs: [...state.logs, log],
      }));
    });

    socket.on('health-status', (status) => {
      set((state) => ({
        currentDeployment: state.currentDeployment
          ? { ...state.currentDeployment, healthStatus: status.healthStatus }
          : null,
      }));
    });

    socket.on('deployment-error', (error) => {
      set({ error: error.message });
    });

    set({ socket });
  },

  unsubscribeFromDeployment: (id: string) => {
    const socket = get().socket;
    if (socket) {
      socket.emit('unsubscribe-deployment', id);
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));