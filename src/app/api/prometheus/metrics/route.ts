import { NextResponse } from 'next/server';

export async function GET() {
  // Placeholder for fetching Prometheus metrics
  // This would typically involve PromQL queries to a Prometheus instance
  const metrics = [
    {
      node: 'k8s-node-1',
      cpuUsagePercentage: 37.5, // (1500m / 4000m) * 100
      memoryUsagePercentage: 50, // (8Gi / 16Gi) * 100
      gpuUsagePercentage: 0,
      gpuMigUsagePercentage: 0,
    },
    {
      node: 'k8s-node-2',
      cpuUsagePercentage: 76.9, // (6000m / 7800m) * 100
      memoryUsagePercentage: 64.5, // (20Gi / 31Gi) * 100
      gpuUsagePercentage: 0,
      gpuMigUsagePercentage: 0,
    },
    {
      node: 'k8s-node-3',
      cpuUsagePercentage: 20.5, // (800m / 3900m) * 100
      memoryUsagePercentage: 26.6, // (4Gi / 15Gi) * 100
      gpuUsagePercentage: 0,
      gpuMigUsagePercentage: 0,
    },
  ];
  return NextResponse.json(metrics);
}
