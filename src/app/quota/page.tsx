'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Cluster {
  id: string;
  name: string;
}

interface QuotaInfo {
  used: string | number;
  limit: string | number;
  unit?: string;
}

interface GpuQuota {
  [profile: string]: {
    used: number;
    limit: number;
  };
}

interface NamespaceQuota {
  namespace: string;
  cpu: QuotaInfo;
  memory: QuotaInfo;
  gpu: GpuQuota;
  storage: QuotaInfo;
}

export default function QuotaPage() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<string>('');
  const [quotas, setQuotas] = useState<NamespaceQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClusters() {
      try {
        const res = await fetch('/api/k8s/clusters');
        if (!res.ok) throw new Error('Failed to fetch clusters');
        const data: Cluster[] = await res.json();
        setClusters(data);
        if (data.length > 0) {
          setSelectedCluster(data[0].id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchClusters();
  }, []);

  useEffect(() => {
    if (!selectedCluster) return;

    async function fetchQuotas() {
      setLoading(true);
      try {
        const res = await fetch(`/api/k8s/quota?cluster=${selectedCluster}`);
        if (!res.ok) throw new Error('Failed to fetch quota data');
        const data: NamespaceQuota[] = await res.json();
        setQuotas(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchQuotas();
  }, [selectedCluster]);

  const calculatePercentage = (used: string | number, limit: string | number) => {
    const u = typeof used === 'string' ? parseFloat(used) : used;
    const l = typeof limit === 'string' ? parseFloat(limit) : limit;
    if (l === 0) return 0;
    return Math.min(100, (u / l) * 100);
  };

  const ProgressBar = ({ label, used, limit, unit, colorClass = 'bg-blue-600' }: { label: string, used: string | number, limit: string | number, unit?: string, colorClass?: string }) => {
    const pct = calculatePercentage(used, limit);
    return (
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
          <span className="text-gray-600 dark:text-gray-400">
            {used} / {limit} {unit}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Namespace Quotas</h1>
        <Link href="/" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition">
          Back to Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <label htmlFor="cluster-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Cluster
        </label>
        <select
          id="cluster-select"
          className="block w-full max-w-xs p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          value={selectedCluster}
          onChange={(e) => setSelectedCluster(e.target.value)}
          disabled={loading && clusters.length === 0}
        >
          {clusters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading && quotas.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-100 text-red-900 rounded">{error}</div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Namespace</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">CPU (Used/Limit)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Memory (Used/Limit)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">GPU (MIG Profiles)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Storage (Used/Limit)</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {quotas.map((q) => (
                <tr key={q.namespace} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 dark:text-blue-400">
                    {q.namespace}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100 mb-1">{q.cpu.used} / {q.cpu.limit} {q.cpu.unit}</div>
                    <div className="w-24 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${calculatePercentage(q.cpu.used, q.cpu.limit)}%` }}></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100 mb-1">{q.memory.used} / {q.memory.limit} {q.memory.unit}</div>
                    <div className="w-24 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${calculatePercentage(q.memory.used, q.memory.limit)}%` }}></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      {Object.entries(q.gpu).map(([profile, stats]) => (
                        <div key={profile} className="flex flex-col">
                          <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                            <span className="truncate max-w-[120px]" title={profile}>{profile.replace('nvidia.com/', '')}</span>
                            <span>{stats.used}/{stats.limit}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1 dark:bg-gray-700">
                            <div className="bg-orange-500 h-1 rounded-full" style={{ width: `${Math.min(100, (stats.used / stats.limit) * 100)}%` }}></div>
                          </div>
                        </div>
                      ))}
                      {Object.keys(q.gpu).length === 0 && <span className="text-xs text-gray-400 italic">None</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100 mb-1">{q.storage.used} / {q.storage.limit} {q.storage.unit}</div>
                    <div className="w-24 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${calculatePercentage(q.storage.used, q.storage.limit)}%` }}></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
