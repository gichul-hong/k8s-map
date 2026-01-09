'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ResourceGrid from '../components/ResourceGrid';

// Define the GPU structure for MIG devices
interface GpuInfo {
  capacity: string;
  allocatable: string;
  usage: string; // From k8s API
  usagePercentage?: number; // From Prometheus metrics
}

interface PodInfo {
  namespace: string;
  name: string;
  gpuCount: number;
}

interface NodeData {
  name: string;
  unschedulable: boolean;
  cpu: { capacity: string; allocatable: string; usage:string };
  memory: { capacity: string; allocatable: string; usage: string };
  gpus: { [migProfile: string]: GpuInfo }; // Now an object for MIG profiles
  pods?: PodInfo[];
}

interface MetricData {
  node: string;
  cpuUsagePercentage: number;
  memoryUsagePercentage: number;
  gpuUsagePercentage?: number; // Overall GPU usage
  gpus?: { [migProfile: string]: { usagePercentage: number } }; // Detailed MIG usage
}

// CombinedNodeData will merge NodeData and MetricData
interface CombinedNodeData {
    name: string;
    unschedulable: boolean;
    cpu: { capacity: string; allocatable: string; usage: string };
    memory: { capacity: string; allocatable: string; usage: string };
    gpus: { [migProfile: string]: GpuInfo };
    pods?: PodInfo[];
    cpuUsagePercentage?: number;
    memoryUsagePercentage?: number;
    gpuUsagePercentage?: number;
}


type ResourceType = 'cpu' | 'memory' | 'gpu';

export default function Home() {
  const [nodes, setNodes] = useState<CombinedNodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<CombinedNodeData | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [nodesResponse, metricsResponse] = await Promise.all([
          fetch('/api/k8s/nodes'),
          fetch('/api/prometheus/metrics'),
        ]);

        if (!nodesResponse.ok) {
          throw new Error(`Failed to fetch nodes: ${nodesResponse.statusText}`);
        }
        if (!metricsResponse.ok) {
          throw new Error(`Failed to fetch metrics: ${metricsResponse.statusText}`);
        }

        const nodesData: NodeData[] = await nodesResponse.json();
        const metricsData: MetricData[] = await metricsResponse.json();

        const combinedData: CombinedNodeData[] = nodesData.map((node) => {
            const metric = metricsData.find((m) => m.node === node.name);
            
            const combinedGpus = { ...node.gpus };
            if (metric?.gpus) {
                for (const migProfile in metric.gpus) {
                    if (combinedGpus[migProfile]) {
                        combinedGpus[migProfile].usagePercentage = metric.gpus[migProfile].usagePercentage;
                    } else {
                        combinedGpus[migProfile] = {
                            capacity: 'N/A',
                            allocatable: 'N/A',
                            usage: 'N/A',
                            usagePercentage: metric.gpus[migProfile].usagePercentage,
                        };
                    }
                }
            }

            return {
                ...node,
                gpus: combinedGpus,
                cpuUsagePercentage: metric?.cpuUsagePercentage,
                memoryUsagePercentage: metric?.memoryUsagePercentage,
                gpuUsagePercentage: metric?.gpuUsagePercentage,
            };
        });

        setNodes(combinedData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const getTotalGpuCapacity = (node: CombinedNodeData) => {
    return Object.values(node.gpus).reduce((acc, gpu) => acc + parseInt(gpu.capacity, 10), 0);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-center">Kubernetes Node Heatmap</h1>
        <Link href="/quota" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-semibold">
          View Quotas
        </Link>
      </div>

      {/* Resource selection buttons removed for clarity, showing all grids */}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {nodes.map((node) => {
          const totalGpuCapacity = getTotalGpuCapacity(node);
          const isCordoned = node.unschedulable;
          const cardBgClass = isCordoned 
            ? 'bg-stone-200 dark:bg-stone-800 ring-2 ring-orange-500' 
            : 'bg-white dark:bg-gray-800';

          return (
            <div
              key={node.name}
              className={`p-4 rounded-lg shadow-md ${cardBgClass} flex flex-col items-center justify-center text-center cursor-pointer transform transition-transform duration-200 hover:scale-105`}
              onClick={() => setSelectedNode(node)}
            >
              <h2 className="text-xl font-semibold mb-4">
                {node.name} {isCordoned && <span className="block text-sm text-orange-600 dark:text-orange-400 font-bold mt-1">(Cordoned)</span>}
              </h2>
              <div className="w-full space-y-4">
                <ResourceGrid label="CPU" percentage={node.cpuUsagePercentage || 0} total={10} />
                <ResourceGrid label="Memory" percentage={node.memoryUsagePercentage || 0} total={10} />
                {totalGpuCapacity > 0 && (
                  <ResourceGrid label="GPU" percentage={node.gpuUsagePercentage || 0} total={totalGpuCapacity} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedNode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={() => setSelectedNode(null)}>
          <div className="p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">Node Details: {selectedNode.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">CPU</h3>
                <p>Capacity: {selectedNode.cpu.capacity}</p>
                <p>Allocatable: {selectedNode.cpu.allocatable}</p>
                <p>Usage: {selectedNode.cpuUsagePercentage?.toFixed(1) || 'N/A'}%</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Memory</h3>
                <p>Capacity: {selectedNode.memory.capacity}</p>
                <p>Allocatable: {selectedNode.memory.allocatable}</p>
                <p>Usage: {selectedNode.memoryUsagePercentage?.toFixed(1) || 'N/A'}%</p>
              </div>
              {Object.keys(selectedNode.gpus).length > 0 && (
                <div className="md:col-span-2">
                  <h3 className="text-xl font-semibold mb-2">GPU (MIG Profiles)</h3>
                  {Object.entries(selectedNode.gpus).map(([migProfile, gpuInfo]) => (
                    <div key={migProfile} className="mb-2 p-2 border rounded dark:border-gray-700">
                      <p className="font-medium">{migProfile.replace('nvidia.com/', '')}</p>
                      <p>Capacity: {gpuInfo.capacity}</p>
                      <p>Allocatable: {gpuInfo.allocatable}</p>
                      {gpuInfo.usagePercentage !== undefined && (
                          <p>Usage: {gpuInfo.usagePercentage?.toFixed(1) || 'N/A'}%</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {selectedNode.pods && selectedNode.pods.length > 0 && (
                <div className="md:col-span-2 mt-4">
                  <h3 className="text-xl font-semibold mb-2 text-orange-600 dark:text-orange-400">GPU Pods ({selectedNode.pods.length})</h3>
                  <div className="overflow-y-auto max-h-64 border rounded dark:border-gray-700">
                    <table className="min-w-full text-sm text-left">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 shadow-sm">
                            <tr className="border-b dark:border-gray-700">
                                <th className="py-2 px-3">Namespace</th>
                                <th className="py-2 px-3">Pod Name</th>
                                <th className="py-2 px-3 text-center">GPU</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedNode.pods.map((pod, idx) => (
                                <tr key={idx} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="py-2 px-3 font-mono text-xs">{pod.namespace}</td>
                                    <td className="py-2 px-3 break-all">{pod.name}</td>
                                    <td className="py-2 px-3 text-center font-bold">{pod.gpuCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 pt-4 mt-2 border-t dark:border-gray-700 flex justify-end">
              <button
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                onClick={() => setSelectedNode(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}