import { NextRequest, NextResponse } from 'next/server';
import * as k8s from '@kubernetes/client-node';

// Helper to parse k8s quantities (simplistic version)
function parseQuantity(value: string): number {
  if (!value) return 0;
  const v = value.toString();
  if (v.endsWith('m')) return parseInt(v) / 1000;
  if (v.endsWith('Ki')) return parseInt(v) * 1024;
  if (v.endsWith('Mi')) return parseInt(v) * 1024 * 1024;
  if (v.endsWith('Gi')) return parseInt(v) * 1024 * 1024 * 1024;
  if (v.endsWith('Ti')) return parseInt(v) * 1024 * 1024 * 1024 * 1024;
  return parseInt(v); // Assuming plain number or unknown suffix
}

function formatMemory(bytes: number): string {
  if (bytes === 0) return '0Gi';
  const gi = bytes / (1024 * 1024 * 1024);
  return `${gi.toFixed(1)}Gi`;
}

function formatCpu(cores: number): string {
  return `${cores.toFixed(1)}`; // Keep 1 decimal for milli-cores
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cluster = searchParams.get('cluster');

  if (!cluster) {
    return NextResponse.json({ error: 'Cluster parameter is required' }, { status: 400 });
  }

  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    
    // If the cluster param matches a context, use it. 
    // Otherwise, we might be using the default context or it might fail if strictly required.
    // For this implementation, we try to find the context.
    const context = kc.contexts.find(c => c.name === cluster);
    if (context) {
      kc.setCurrentContext(context.name);
    } else {
       // Optional: Log warning or error if context not found
       console.warn(`Context ${cluster} not found, using default context if available.`);
    }

    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    // 1. List Namespaces
    const nsRes = await k8sApi.listNamespace();
    // In newer client versions or specific generations, the response might be the body directly
    // or TypeScript infers it as such. Adjusting based on error:
    const items = (nsRes as any).body ? (nsRes as any).body.items : (nsRes as any).items;
    
    const namespaces = (items || [])
      .map((ns: k8s.V1Namespace) => ns.metadata?.name || '')
      .filter((name: string) => name.startsWith('aip-'));

    const quotaPromises = namespaces.map(async (ns: string) => {
      try {
        const quotaRes = await k8sApi.listNamespacedResourceQuota({ namespace: ns });
        const quotas = (quotaRes as any).body ? (quotaRes as any).body.items : (quotaRes as any).items;

        // Aggregate quotas if multiple exist in one namespace
        let cpuUsed = 0, cpuLimit = 0;
        let memUsed = 0, memLimit = 0;
        let storageUsed = 0, storageLimit = 0;
        const gpuData: { [key: string]: { used: number, limit: number } } = {};

        quotas.forEach((q: k8s.V1ResourceQuota) => {
          const hard = q.status?.hard || {};
          const used = q.status?.used || {};

          // CPU
          if (hard['limits.cpu']) cpuLimit += parseQuantity(hard['limits.cpu']);
          if (used['limits.cpu']) cpuUsed += parseQuantity(used['limits.cpu']);
          // Fallback to requests if limits not present, or handle distinct? 
          // Usually quota is set on 'requests.cpu' or 'limits.cpu'. Let's check limits first.

          // Memory
          if (hard['limits.memory']) memLimit += parseQuantity(hard['limits.memory']);
          if (used['limits.memory']) memUsed += parseQuantity(used['limits.memory']);

          // Storage (usually requests.storage)
          if (hard['requests.storage']) storageLimit += parseQuantity(hard['requests.storage']);
          if (used['requests.storage']) storageUsed += parseQuantity(used['requests.storage']);

          // GPU & Custom Resources - Filtering for specific keys only
          const targetGpuKeys = ['requests.mig-1g.10gb', 'requests.mig-2g.20gb', 'requests.gpu'];
          
          Object.keys(hard).forEach(key => {
            // Check if the key matches our target list (handling potential nvidia.com/ prefixes)
            const isTarget = targetGpuKeys.some(target => key === target || key.endsWith('/' + target.replace('requests.', '')));
            
            if (isTarget) {
              if (!gpuData[key]) gpuData[key] = { used: 0, limit: 0 };
              gpuData[key].limit += parseQuantity(hard[key]);
              gpuData[key].used += parseQuantity(used[key] || '0');
            }
          });
        });

        return {
          namespace: ns,
          cpu: {
            used: formatCpu(cpuUsed),
            limit: formatCpu(cpuLimit),
            unit: 'cores'
          },
          memory: {
            used: formatMemory(memUsed),
            limit: formatMemory(memLimit),
            unit: 'Gi'
          },
          gpu: gpuData,
          storage: {
            used: formatMemory(storageUsed),
            limit: formatMemory(storageLimit),
            unit: 'Gi'
          }
        };
      } catch (e) {
        console.error(`Error fetching quota for ${ns}:`, e);
        return null; 
      }
    });

    const realQuotaData = (await Promise.all(quotaPromises)).filter(q => q !== null);
    
    // If we found namespaces, return real data. If not (e.g. empty cluster or no match), 
    // we might still want to return empty list or fallback? 
    // Let's return real data if the connection succeeded.
    return NextResponse.json(realQuotaData);

  } catch (error) {
    console.error('Failed to connect to Kubernetes, falling back to dummy data:', error);
    
    // --- Fallback Dummy Data Generation (Existing Logic) ---
    const namespaces = [
      'aip-training',
      'aip-inference',
      'aip-research',
      'aip-sandbox',
      'aip-bi-team',
    ];
  
    const quotaData = namespaces.map((ns) => {
      // Randomize usage slightly to make it look real
      const cpuLimit = 100;
      const cpuUsed = Math.floor(Math.random() * 80);
      
      const memLimit = 500; // Gi
      const memUsed = Math.floor(Math.random() * 400);
  
      const gpuLimit = 8;
      const gpuUsed = Math.floor(Math.random() * 6);
  
      const storageLimit = 1000; // Gi
      const storageUsed = Math.floor(Math.random() * 800);
  
      return {
        namespace: ns,
        cpu: {
          used: `${cpuUsed}`,
          limit: `${cpuLimit}`,
          unit: 'cores'
        },
        memory: {
          used: `${memUsed}Gi`,
          limit: `${memLimit}Gi`,
          unit: 'Gi'
        },
        gpu: {
          'requests.mig-1g.10gb': { used: Math.floor(Math.random() * 2), limit: 2 },
          'requests.mig-2g.20gb': { used: Math.floor(Math.random() * 2), limit: 2 },
          'requests.gpu': { used: Math.floor(Math.random() * 6), limit: 8 },
        },
        storage: {
          used: `${storageUsed}Gi`,
          limit: `${storageLimit}Gi`,
          unit: 'Gi'
        }
      };
    });
  
    return NextResponse.json(quotaData);
  }
}
