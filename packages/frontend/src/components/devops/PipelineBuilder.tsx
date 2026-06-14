'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePipelineStore } from '@/stores/pipeline.store';
import { PipelineStage } from '@/types/pipeline';

const STAGE_TYPES = [
  'INSTALL',
  'TEST',
  'BUILD',
  'SECURITY_SCAN',
  'CONTAINERIZE',
  'DEPLOY',
  'VERIFY',
  'HEALTH_CHECK',
];

export function PipelineBuilder({ projectId }: { projectId: string }) {
  const { currentPipeline, createPipeline } = usePipelineStore();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [newStage, setNewStage] = useState<Partial<PipelineStage>>({
    type: 'INSTALL',
    timeout: 3600000,
    retryCount: 0,
  });

  const addStage = () => {
    if (!newStage.name || !newStage.type) return;

    const stage: PipelineStage = {
      id: `stage-${Date.now()}`,
      name: newStage.name,
      type: newStage.type as any,
      order: stages.length,
      timeout: newStage.timeout || 3600000,
      retryCount: newStage.retryCount || 0,
    };

    setStages([...stages, stage]);
    setNewStage({ type: 'INSTALL', timeout: 3600000, retryCount: 0 });
  };

  const removeStage = (id: string) => {
    setStages(stages.filter((s) => s.id !== id));
  };

  const savePipeline = async () => {
    await createPipeline({
      projectId,
      name: `Pipeline-${Date.now()}`,
      stages,
    });
  };

  return (
    <div className="space-y-6">
      {/* Stage Input */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-4"
      >
        <h3 className="font-semibold text-white">Add Pipeline Stage</h3>

        <input
          type="text"
          placeholder="Stage name..."
          value={newStage.name || ''}
          onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-gray-500"
        />

        <select
          value={newStage.type || ''}
          onChange={(e) => setNewStage({ ...newStage, type: e.target.value })}
          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white"
        >
          {STAGE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <button
          onClick={addStage}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
        >
          Add Stage
        </button>
      </motion.div>

      {/* Pipeline Stages */}
      <motion.div className="space-y-2">
        <h3 className="font-semibold text-white">Pipeline Stages</h3>
        <AnimatePresence>
          {stages.map((stage, idx) => (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3 p-3 bg-slate-700/50 border border-slate-600 rounded"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full text-white font-semibold">
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{stage.name}</p>
                <p className="text-xs text-gray-400">{stage.type}</p>
              </div>
              <button
                onClick={() => removeStage(stage.id)}
                className="px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded text-sm"
              >
                Remove
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Save */}
      {stages.length > 0 && (
        <button
          onClick={savePipeline}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors"
        >
          Save Pipeline
        </button>
      )}
    </div>
  );
}