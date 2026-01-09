import { NextResponse } from 'next/server';

export async function GET() {
  const clusters = [
    { id: 'cluster-1', name: 'production-cluster' },
    { id: 'cluster-2', name: 'staging-cluster' },
    { id: 'cluster-3', name: 'dev-cluster' },
  ];
  return NextResponse.json(clusters);
}
