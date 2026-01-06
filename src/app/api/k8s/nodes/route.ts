import { NextResponse } from 'next/server';
// import * as k8s from '@kubernetes/client-node'; // Comment out for dummy data

export async function GET() {
  // --- Start of Dummy Data Section ---
  const dummyNodes = [
    {
      name: 'mig-node-1',
      unschedulable: false,
      cpu: { capacity: '32', allocatable: '31', usage: '0m' },
      memory: { capacity: '128Gi', allocatable: '120Gi', usage: '0Mi' },
      gpus: {
        'nvidia.com/mig-1g.5gb': { capacity: '4', allocatable: '4', usage: '0' },
        'nvidia.com/mig-2g.10gb': { capacity: '2', allocatable: '2', usage: '0' },
      },
      pods: [
        { namespace: 'aip-training', name: 'training-job-v1', gpuCount: 1 },
        { namespace: 'aip-research', name: 'jupyter-notebook-0', gpuCount: 1 },
      ]
    },
    {
      name: 'mig-node-2',
      unschedulable: true, // Mark as unschedulable for testing
      cpu: { capacity: '32', allocatable: '31', usage: '0m' },
      memory: { capacity: '128Gi', allocatable: '120Gi', usage: '0Mi' },
      gpus: {
        'nvidia.com/mig-3g.20gb': { capacity: '2', allocatable: '2', usage: '0' },
      },
      pods: [
        { namespace: 'aip-inference', name: 'inference-service-x', gpuCount: 1 },
      ]
    },
    {
      name: 'non-mig-gpu-node', // New node for non-MIG GPU
      unschedulable: false,
      cpu: { capacity: '16', allocatable: '15', usage: '0m' },
      memory: { capacity: '64Gi', allocatable: '60Gi', usage: '0Mi' },
      gpus: {
        'nvidia.com/gpu': { capacity: '4', allocatable: '4', usage: '0' }, // 4 non-MIG GPUs
      },
      pods: [
        { namespace: 'default', name: 'legacy-gpu-app', gpuCount: 2 }, // Should be filtered out in real logic if not starting with aip-, but keeping as outlier example or update to match? Let's update to match for consistency visually, or keep to show logic might filter it?
        // User asked for "filtering logic", so dummy data should probably look like the result of that filtering.
        // Let's make this one 'aip-legacy'
        { namespace: 'aip-legacy', name: 'legacy-gpu-app', gpuCount: 2 },
      ]
    },
    {
      name: 'no-gpu-node',
      unschedulable: false,
      cpu: { capacity: '16', allocatable: '15', usage: '0m' },
      memory: { capacity: '64Gi', allocatable: '60Gi', usage: '0Mi' },
      gpus: {},
      pods: []
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

    // Fetch nodes and pods in parallel
    const [nodesRes, podsRes] = await Promise.all([
      k8sApi.listNode(),
      k8sApi.listPodForAllNamespaces()
    ]);

    const allPods = podsRes.body.items;

    const nodes = nodesRes.body.items.map((node) => {
      const nodeName = node.metadata?.name || 'unknown';
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

      // Filter pods for this node and check for GPU usage
      const nodePods = allPods.filter(pod => {
        const ns = pod.metadata?.namespace || '';
        // Filter 1: Namespace must start with 'aip-'
        if (!ns.startsWith('aip-')) return false;
        // Filter 2: Must be on this node
        if (pod.spec?.nodeName !== nodeName) return false;
        return true;
      }).map(pod => {
         let gpuCount = 0;
         // Check containers for nvidia.com/ resource limits
         pod.spec?.containers.forEach(container => {
           const limits = container.resources?.limits || {};
           for (const key in limits) {
             if (key.startsWith('nvidia.com/')) {
               const val = parseInt(limits[key] || '0', 10);
               if (!isNaN(val)) gpuCount += val;
             }
           }
         });
         
         return {
           namespace: pod.metadata?.namespace || '',
           name: pod.metadata?.name || '',
           gpuCount: gpuCount
         };
      }).filter(p => p.gpuCount > 0); // Filter 3: Must have > 0 GPU usage

      return {
        name: nodeName,
        unschedulable: node.spec?.unschedulable || false,
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
        pods: nodePods
      };
    });

    return NextResponse.json(nodes);
  } catch (error: any) {
    console.error('Error fetching Kubernetes nodes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  */
}
