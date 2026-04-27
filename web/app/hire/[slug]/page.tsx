import { notFound } from 'next/navigation';
import { getAgent } from '@/lib/agents';
import HireFlow from './HireFlow';

export default async function HirePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = getAgent(slug);
  if (!agent || !agent.available) notFound();
  return <HireFlow agent={agent} />;
}
