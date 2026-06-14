'use client';

import { motion } from 'framer-motion';
import { useDeploymentStore } from '@/stores/deployment.store';
import { Deployment } from '@/types/deployment';
import clsx from 'clsx';

export function DeploymentCard({ deployment }: { deployment: Deployment }) {
  const { getDeployment, subscribeToDeployment } = useDeploymentStore();

  const handleClick = async () => {
    await getDeployment(deployment.id);
    subscribeToDeployment(deployment.id);
  };

  const statusColors = {
    PENDING: 'bg-yellow-500/20 text-yellow-300',
    BUILDING: 'bg-blue-500/20 text-blue-300',
    TESTING: 'bg-indigo-500/20 text-indigo-300',
    SECURITY_SCANNING: 'bg-orange-500/20 text-orange-300',
    DEPLOYING: 'bg-purple-500/20 text-purple-300',
    VERIFYING: 'bg-cyan-500/20 text-cyan-300',
    SUCCESS: 'bg-green-500/20 text-green-300',
    FAILED: 'bg-red-500/20 text-red-300',
    ROLLED_BACK: 'bg-gray-500/20 text-gray-300',
  };

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      className="w-full text-left p-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-white">{deployment.name}</h3>
          <p className="text-xs text-gray-400 mt-1">{deployment.version}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={clsx('px-2 py-1 rounded text-xs font-medium', statusColors[deployment.status])}>
              {deployment.status.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-gray-400">{deployment.environment}</span>
          </div>
        </div>
        <div className={clsx('w-3 h-3 rounded-full', {
          'bg-green-500': deployment.healthStatus === 'HEALTHY',
          'bg-red-500': deployment.healthStatus === 'UNHEALTHY',
          'bg-yellow-500': deployment.healthStatus === 'DEGRADED',
          'bg-gray-500': deployment.healthStatus === 'UNKNOWN',
        })} />
      </div>
    </motion.button>
  );
}