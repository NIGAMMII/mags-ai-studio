'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Environment } from '@/types/deployment';

const ENVIRONMENTS: Environment[] = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'];

export function EnvironmentManager({ projectId }: { projectId: string }) {
  const [selectedEnv, setSelectedEnv] = useState<Environment>('DEVELOPMENT');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [newVar, setNewVar] = useState({ key: '', value: '', isSecret: false });

  const addVariable = () => {
    if (!newVar.key) return;
    setVariables({ ...variables, [newVar.key]: newVar.value });
    setNewVar({ key: '', value: '', isSecret: false });
  };

  const removeVariable = (key: string) => {
    const { [key]: _, ...rest } = variables;
    setVariables(rest);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 bg-slate-800/50 border border-slate-700 rounded-lg p-6"
    >
      <h2 className="text-2xl font-bold text-white">Environment Manager</h2>

      {/* Environment Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        {ENVIRONMENTS.map((env) => (
          <button
            key={env}
            onClick={() => setSelectedEnv(env)}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedEnv === env
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {env}
          </button>
        ))}
      </div>

      {/* Add Variable */}
      <div className="space-y-3">
        <h3 className="font-semibold text-white">Add Variable</h3>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Key"
            value={newVar.key}
            onChange={(e) => setNewVar({ ...newVar, key: e.target.value })}
            className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-gray-500"
          />
          <input
            type={newVar.isSecret ? 'password' : 'text'}
            placeholder="Value"
            value={newVar.value}
            onChange={(e) => setNewVar({ ...newVar, value: e.target.value })}
            className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-gray-500"
          />
        </div>
        <label className="flex items-center gap-2 text-gray-300">
          <input
            type="checkbox"
            checked={newVar.isSecret}
            onChange={(e) => setNewVar({ ...newVar, isSecret: e.target.checked })}
          />
          Treat as secret (encrypted)
        </label>
        <button
          onClick={addVariable}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
        >
          Add Variable
        </button>
      </div>

      {/* Variables List */}
      <div className="space-y-2">
        <h3 className="font-semibold text-white">Variables</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {Object.entries(variables).map(([key, value]) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 bg-slate-700/50 border border-slate-600 rounded"
            >
              <div>
                <p className="font-medium text-white">{key}</p>
                <p className="text-xs text-gray-400">•••••••</p>
              </div>
              <button
                onClick={() => removeVariable(key)}
                className="px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded text-sm"
              >
                Remove
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}