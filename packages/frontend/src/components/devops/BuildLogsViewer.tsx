'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useDeploymentStore } from '@/stores/deployment.store';
import { DeploymentLog } from '@/types/deployment';

export function BuildLogsViewer() {
  const { logs } = useDeploymentStore();
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const logLevelColors = {
    DEBUG: 'text-gray-400',
    INFO: 'text-blue-300',
    WARN: 'text-yellow-300',
    ERROR: 'text-red-300',
    CRITICAL: 'text-red-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto"
    >
      {logs.length === 0 ? (
        <div className="text-gray-400">No logs yet...</div>
      ) : (
        logs.map((log, idx) => (
          <div key={idx} className="py-1">
            <span className="text-gray-500">[{log.timestamp.toLocaleTimeString()}]</span>
            {' '}
            <span className={logLevelColors[log.level as keyof typeof logLevelColors] || 'text-white'}>
              {log.level}
            </span>
            {' '}
            {log.stepName && <span className="text-cyan-300">[{log.stepName}]</span>}
            {' '}
            <span className="text-gray-300">{log.message}</span>
          </div>
        ))
      )}
      <div ref={logsEndRef} />
    </motion.div>
  );
}