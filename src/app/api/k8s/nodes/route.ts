import { NextResponse } from 'next/server';

export async function GET() {
  // Placeholder for fetching Kubernetes node information
  const nodes = [
    {
      name: 'k8s-node-1',
      cpu: { capacity: '4', allocatable: '3900m', usage: '1500m' },
      memory: { capacity: '16Gi', allocatable: '15Gi', usage: '8Gi' },
      gpu: { capacity: '0', allocatable: '0', usage: '0' }, // Assuming no GPU for now
    },
    {
      name: 'k8s-node-2',
      cpu: { capacity: '8', allocatable: '7800m', usage: '6000m' },
      memory: { capacity: '32Gi', allocatable: '31Gi', usage: '20Gi' },
      gpu: { capacity: '0', allocatable: '0', usage: '0' },
    },
    {
      name: 'k8s-node-3',
      cpu: { capacity: '4', allocatable: '3900m', usage: '800m' },
      memory: { capacity: '16Gi', allocatable: '15Gi', usage: '4Gi' },
      gpu: { capacity: '0', allocatable: '0', usage: '0' },
    },
  ];
  return NextResponse.json(nodes);
}
