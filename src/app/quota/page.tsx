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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quotas.map((q) => (
            <div key={q.namespace} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">{q.namespace}</h2>
              
              <div className="space-y-4">
                <ProgressBar 
                  label="CPU" 
                  used={q.cpu.used} 
                  limit={q.cpu.limit} 
                  unit={q.cpu.unit} 
                  colorClass="bg-green-500"
                />
                <ProgressBar 
                  label="Memory" 
                  used={q.memory.used} 
                  limit={q.memory.limit} 
                  unit={q.memory.unit} 
                  colorClass="bg-purple-500"
                />
                
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                  <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">GPU (MIG)</h3>
                  {Object.entries(q.gpu).map(([profile, stats]) => (
                    <div key={profile} className="mb-2">
                       <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400 truncate w-2/3" title={profile}>{profile.replace('nvidia.com/', '')}</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {stats.used}/{stats.limit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                        <div 
                          className="bg-orange-500 h-1.5 rounded-full" 
                          style={{ width: `${Math.min(100, (stats.used / stats.limit) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  {Object.keys(q.gpu).length === 0 && <p className="text-xs text-gray-500">No GPU quota</p>}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                   <ProgressBar 
                    label="Storage" 
                    used={q.storage.used} 
                    limit={q.storage.limit} 
                    unit={q.storage.unit} 
                    colorClass="bg-indigo-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
