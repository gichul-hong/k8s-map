'use client';

import { useState, useEffect } from 'react';

// Define the GPU structure for MIG devices
interface GpuInfo {
  capacity: string;
  allocatable: string;
  usage: string; // From k8s API
  usagePercentage?: number; // From Prometheus metrics
}

interface NodeData {
  name: string;
  cpu: { capacity: string; allocatable: string; usage: string };
  memory: { capacity: string; allocatable: string; usage: string };
  gpus: { [migProfile: string]: GpuInfo }; // Now an object for MIG profiles
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
    cpu: { capacity: string; allocatable: string; usage: string };
    memory: { capacity: string; allocatable: string; usage: string };
    gpus: { [migProfile: string]: GpuInfo };
    cpuUsagePercentage?: number;
    memoryUsagePercentage?: number;
    gpuUsagePercentage?: number;
}


type ResourceType = 'cpu' | 'memory' | 'gpu';

export default function Home() {
  const [nodes, setNodes] = useState<CombinedNodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<ResourceType>('cpu');
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
            
            // Merge GPU usage percentages into the gpus object
            const combinedGpus = { ...node.gpus };
            if (metric?.gpus) {
                for (const migProfile in metric.gpus) {
                    if (combinedGpus[migProfile]) {
                        combinedGpus[migProfile].usagePercentage = metric.gpus[migProfile].usagePercentage;
                    } else {
                        // If MIG profile exists in metrics but not in k8s capacity, add it
                        combinedGpus[migProfile] = {
                            capacity: 'N/A', // or '0'
                            allocatable: 'N/A', // or '0'
                            usage: 'N/A',
                            usagePercentage: metric.gpus[migProfile].usagePercentage,
                        };
                    }
                }
            }

            return {
                ...node,
                gpus: combinedGpus, // Use the combined GPU info
                cpuUsagePercentage: metric?.cpuUsagePercentage,
                memoryUsagePercentage: metric?.memoryUsagePercentage,
                gpuUsagePercentage: metric?.gpuUsagePercentage, // Overall GPU usage
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
        return node.cpuUsagePercentage || 0;
      case 'memory':
        return node.memoryUsagePercentage || 0;
      case 'gpu':
        return node.gpuUsagePercentage || 0; // Use overall GPU usage
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
          const usagePercentage = getResourceUsagePercentage(node, selectedResource);
          return (
            <div
              key={node.name}
              className="p-4 rounded-lg shadow-md flex flex-col items-center justify-center text-center cursor-pointer transform transition-transform duration-200 hover:scale-105"
              style={{
                backgroundColor: getHeatmapColor(usagePercentage),
              }}
              onClick={() => setSelectedNode(node)}
            >
              <h2 className="text-xl font-semibold mb-2">{node.name}</h2>
              <p>
                {selectedResource.toUpperCase()} Usage: {usagePercentage.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>

      {selectedNode && (
        <div className="mt-8 p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          <h2 className="text-2xl font-bold mb-4">Node Details: {selectedNode.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">CPU</h3>
              <p>Capacity: {selectedNode.cpu.capacity}</p>
              <p>Allocatable: {selectedNode.cpu.allocatable}</p>
              <p>Usage: {selectedNode.cpu.usage} ({selectedNode.cpuUsagePercentage?.toFixed(1) || 'N/A'}%)</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Memory</h3>
              <p>Capacity: {selectedNode.memory.capacity}</p>
              <p>Allocatable: {selectedNode.memory.allocatable}</p>
              <p>Usage: {selectedNode.memory.usage} ({selectedNode.memoryUsagePercentage?.toFixed(1) || 'N/A'}%)</p>
            </div>
            {Object.keys(selectedNode.gpus).length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-2">GPU (MIG Profiles)</h3>
                {Object.entries(selectedNode.gpus).map(([migProfile, gpuInfo]) => (
                  <div key={migProfile} className="mb-2 p-2 border rounded">
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
            {Object.keys(selectedNode.gpus).length === 0 && selectedResource === 'gpu' && (
                <p>No GPU or MIG devices found for this node.</p>
            )}
          </div>
          <button
            className="mt-6 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            onClick={() => setSelectedNode(null)}
          >
            Close Details
          </button>
        </div>
      )}
    </div>
  );
}
