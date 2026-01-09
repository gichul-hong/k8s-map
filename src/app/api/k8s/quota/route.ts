import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cluster = searchParams.get('cluster');

  if (!cluster) {
    return NextResponse.json({ error: 'Cluster parameter is required' }, { status: 400 });
  }

  // Dummy data generation
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
        // Simulating MIG profiles
        'nvidia.com/mig-1g.5gb': { used: Math.floor(Math.random() * 2), limit: 2 },
        'nvidia.com/mig-2g.10gb': { used: Math.floor(Math.random() * 2), limit: 2 },
        'nvidia.com/mig-3g.20gb': { used: Math.floor(Math.random() * 2), limit: 4 },
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
