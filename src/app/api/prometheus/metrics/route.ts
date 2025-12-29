import { NextResponse } from 'next/server';

// const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090'; // Comment out for dummy data

export async function GET() {
  // --- Start of Dummy Data Section ---
  const dummyMetrics = [
    {
      node: 'mig-node-1',
      cpuUsagePercentage: 45.5,
      memoryUsagePercentage: 60.1,
      gpuUsagePercentage: 77.5, // (90 + 65) / 2
      gpus: {
        'nvidia.com/mig-1g.5gb': { usagePercentage: 90 },
        'nvidia.com/mig-2g.10gb': { usagePercentage: 65 },
      },
    },
    {
      node: 'mig-node-2',
      cpuUsagePercentage: 80.2,
      memoryUsagePercentage: 75.8,
      gpuUsagePercentage: 95.0,
      gpus: {
        'nvidia.com/mig-3g.20gb': { usagePercentage: 95 },
      },
    },
    {
      node: 'non-mig-gpu-node', // New node for non-MIG GPU
      cpuUsagePercentage: 70.0,
      memoryUsagePercentage: 80.0,
      gpuUsagePercentage: 50.0,
      gpus: {
        'nvidia.com/gpu': { usagePercentage: 50 }, // Non-MIG GPU
      },
    },
    {
      node: 'no-gpu-node',
      cpuUsagePercentage: 15.0,
      memoryUsagePercentage: 30.5,
      gpuUsagePercentage: 0,
      gpus: {},
    },
  ];
  return NextResponse.json(dummyMetrics);
  // --- End of Dummy Data Section ---

  /*
  // Original Live Data Logic
  async function queryPrometheus(query: string): Promise<any[]> {
    try {
      const response = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        console.warn(`Prometheus query failed with status ${response.status}: ${query}`);
        return [];
      }
      const data = await response.json();
      if (data.status !== 'success') {
        console.warn(`Prometheus query was not successful for: ${query}`);
        return [];
      }
      return data.data.result;
    } catch (error) {
      console.error(`Error during Prometheus query for: ${query}`, error);
      return [];
    }
  }

  export async function GET() {
    try {
      const cpuQuery = '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)';
      const memoryQuery = '(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100';
      const gpuQuery = 'avg by (instance, gpu, mig_profile) (dcgm_gpu_utilization)'; 

      const [cpuMetrics, memoryMetrics, gpuMetrics] = await Promise.all([
        queryPrometheus(cpuQuery),
        queryPrometheus(memoryQuery),
        queryPrometheus(gpuQuery),
      ]);

      const metricsMap = new Map<string, any>();
      const getNodeName = (metric: any) => metric.metric.instance.split(':')[0];

      cpuMetrics.forEach(metric => {
        const nodeName = getNodeName(metric);
        if (!metricsMap.has(nodeName)) metricsMap.set(nodeName, { node: nodeName, gpus: {} });
        metricsMap.get(nodeName).cpuUsagePercentage = parseFloat(metric.value[1]);
      });

      memoryMetrics.forEach(metric => {
        const nodeName = getNodeName(metric);
        if (!metricsMap.has(nodeName)) metricsMap.set(nodeName, { node: nodeName, gpus: {} });
        metricsMap.get(nodeName).memoryUsagePercentage = parseFloat(metric.value[1]);
      });

      gpuMetrics.forEach(metric => {
        const nodeName = getNodeName(metric);
        const migProfile = metric.metric.mig_profile;
        const gpuIndex = metric.metric.gpu;

        let resourceKey;
        if (migProfile) {
          resourceKey = `nvidia.com/${migProfile}`;
        } else {
          resourceKey = `nvidia.com/gpu`;
        }

        if (!metricsMap.has(nodeName)) metricsMap.set(nodeName, { node: nodeName, gpus: {} });
        
        const nodeMetrics = metricsMap.get(nodeName);
        
        if (!nodeMetrics.gpus[resourceKey]) {
          nodeMetrics.gpus[resourceKey] = { usagePercentage: 0, count: 0 };
        }
        
        nodeMetrics.gpus[resourceKey].usagePercentage += parseFloat(metric.value[1]);
        nodeMetrics.gpus[resourceKey].count += 1;
      });

      metricsMap.forEach(nodeMetrics => {
        for (const resourceKey in nodeMetrics.gpus) {
          if (nodeMetrics.gpus[resourceKey].count > 1) {
            nodeMetrics.gpus[resourceKey].usagePercentage /= nodeMetrics.gpus[resourceKey].count;
          }
        }
      });

      metricsMap.forEach(nodeMetrics => {
          let totalGpuUsage = 0;
          let gpuCount = 0;
          for (const profile in nodeMetrics.gpus) {
              totalGpuUsage += nodeMetrics.gpus[profile].usagePercentage || 0;
              gpuCount++;
          }
          nodeMetrics.gpuUsagePercentage = gpuCount > 0 ? totalGpuUsage / gpuCount : 0;
      });

      const metrics = Array.from(metricsMap.values());

      return NextResponse.json(metrics);
    } catch (error: any) {
      console.error('Error fetching Prometheus metrics:', error);
      return NextResponse.json({ error: 'Failed to fetch Prometheus metrics', details: error.message }, { status: 500 });
    }
  }
  */
}