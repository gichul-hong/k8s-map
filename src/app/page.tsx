'use client';

import { useState, useEffect } from 'react';

interface NodeData {
  name: string;
  cpu: { capacity: string; allocatable: string; usage: string };
  memory: { capacity: string; allocatable: string; usage: string };
  gpu: { capacity: string; allocatable: string; usage: string };
}

interface MetricData {
  node: string;
  cpuUsagePercentage: number;
  memoryUsagePercentage: number;
  gpuUsagePercentage: number;
  gpuMigUsagePercentage: number;
}

interface CombinedNodeData extends NodeData, MetricData {}

type ResourceType = 'cpu' | 'memory' | 'gpu';

export default function Home() {
  const [nodes, setNodes] = useState<CombinedNodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<ResourceType>('cpu');

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
          return { ...node, ...metric };
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

  const getHeatmapColor = (percentage: number) => {
    // Simple color gradient from green (low usage) to red (high usage)
    // 0% usage is green, 100% usage is red
    const r = Math.floor(percentage * 2.55); // Scale 0-100 to 0-255
    const g = Math.floor((100 - percentage) * 2.55); // Scale 0-100 to 0-255
    const b = 0;
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getResourceUsagePercentage = (node: CombinedNodeData, resource: ResourceType) => {
    switch (resource) {
      case 'cpu':
        return node.cpuUsagePercentage;
      case 'memory':
        return node.memoryUsagePercentage;
      case 'gpu':
        return node.gpuUsagePercentage;
      default:
        return 0;
    }
  };

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
      <h1 className="text-4xl font-bold mb-8 text-center">Kubernetes Node Heatmap</h1>

      <div className="flex justify-center mb-8 space-x-4">
        <button
          className={`px-4 py-2 rounded-lg ${
            selectedResource === 'cpu' ? 'bg-blue-500 text-white' : 'bg-gray-300 dark:bg-gray-700'
          }`}
          onClick={() => setSelectedResource('cpu')}
        >
          CPU
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${
            selectedResource === 'memory' ? 'bg-blue-500 text-white' : 'bg-gray-300 dark:bg-gray-700'
          }`}
          onClick={() => setSelectedResource('memory')}
        >
          Memory
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${
            selectedResource === 'gpu' ? 'bg-blue-500 text-white' : 'bg-gray-300 dark:bg-gray-700'
          }`}
          onClick={() => setSelectedResource('gpu')}
        >
          GPU
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {nodes.map((node) => {
          const usagePercentage = getResourceUsagePercentage(node, selectedResource) || 0;
          return (
            <div
              key={node.name}
              className="p-4 rounded-lg shadow-md flex flex-col items-center justify-center text-center"
              style={{
                backgroundColor: getHeatmapColor(usagePercentage),
              }}
            >
              <h2 className="text-xl font-semibold mb-2">{node.name}</h2>
              <p>
                {selectedResource.toUpperCase()} Usage: {usagePercentage.toFixed(1)}%
              </p>
              {selectedResource === 'cpu' && (
                <p>
                  Capacity: {node.cpu.capacity}, Used: {node.cpu.usage}
                </p>
              )}
              {selectedResource === 'memory' && (
                <p>
                  Capacity: {node.memory.capacity}, Used: {node.memory.usage}
                </p>
              )}
              {selectedResource === 'gpu' && (
                <p>
                  Capacity: {node.gpu.capacity}, Used: {node.gpu.usage}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
