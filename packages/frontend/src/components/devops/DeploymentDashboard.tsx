'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDeploymentStore } from '@/stores/deployment.store';
import { DeploymentCard } from './DeploymentCard';

export function DeploymentDashboard({ projectId }: { projectId: string }) {
  const { deployments, currentDeployment, isLoading, error, fetchDeployments } =
    useDeploymentStore();

  useEffect(() => {
    fetchDeployments(projectId);
  }, [projectId, fetchDeployments]);

  return (
    <div className="h-full flex flex-col bg-slate-900 space-y-6 p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white">Deployments</h1>
        <p className="text-gray-400 mt-1">Manage and monitor your deployments</p>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
        {/* Deployment List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-1 overflow-y-auto space-y-3"
        >
          {deployments.map((deployment) => (
            <DeploymentCard key={deployment.id} deployment={deployment} />
          ))}
        </motion.div>

        {/* Deployment Detail */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-2 overflow-y-auto"
        >
          {currentDeployment ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white">{currentDeployment.name}</h2>
              <p className="text-gray-400">Version: {currentDeployment.version}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Select a deployment to view details</p>
            </div>
          )}
        </motion.div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-300"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}