import { NextResponse } from 'next/server';
// import * as k8s from '@kubernetes/client-node'; // Comment out for dummy data

export async function GET() {
  // --- Start of Dummy Data Section ---
  const dummyNodes = [
    {
      name: 'mig-node-1',
      cpu: { capacity: '32', allocatable: '31', usage: '0m' },
      memory: { capacity: '128Gi', allocatable: '120Gi', usage: '0Mi' },
      gpus: {
        'nvidia.com/mig-1g.5gb': { capacity: '4', allocatable: '4', usage: '0' },
        'nvidia.com/mig-2g.10gb': { capacity: '2', allocatable: '2', usage: '0' },
      },
    },
    {
      name: 'mig-node-2',
      cpu: { capacity: '32', allocatable: '31', usage: '0m' },
      memory: { capacity: '128Gi', allocatable: '120Gi', usage: '0Mi' },
      gpus: {
        'nvidia.com/mig-3g.20gb': { capacity: '2', allocatable: '1', usage: '0' },
      },
    },
    {
      name: 'no-gpu-node',
      cpu: { capacity: '16', allocatable: '15', usage: '0m' },
      memory: { capacity: '64Gi', allocatable: '60Gi', usage: '0Mi' },
      gpus: {},
    },
  ];
  return NextResponse.json(dummyNodes);
  // --- End of Dummy Data Section ---

  /* 
  // Original Live Data Logic
  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    const res = await k8sApi.listNode();
    const nodes = res.body.items.map((node) => {
      const capacity = node.status?.capacity || {};
      const allocatable = node.status?.allocatable || {};
      
      const gpus: { [key: string]: { capacity: string; allocatable: string; usage: string } } = {};

      for (const key in capacity) {
        if (key.startsWith('nvidia.com/')) {
          gpus[key] = {
            capacity: capacity[key] || '0',
            allocatable: allocatable[key] || '0',
            usage: '0',
          };
        }
      }

      return {
        name: node.metadata?.name || 'unknown',
        cpu: { 
          capacity: capacity['cpu'] || 'N/A', 
          allocatable: allocatable['cpu'] || 'N/A', 
          usage: '0m' 
        },
        memory: { 
          capacity: capacity['memory'] || 'N/A', 
          allocatable: allocatable['memory'] || 'N/A', 
          usage: '0Mi' 
        },
        gpus: gpus,
      };
    });

    return NextResponse.json(nodes);
  } catch (error: any) {
    console.error('Error fetching Kubernetes nodes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  */
}