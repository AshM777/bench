import Link from 'next/link';
import { agents } from '@/lib/agents';
import { Wrench } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight">Bench</span>
        <span className="text-sm text-zinc-500">Hire AI agents like team members</span>
      </nav>

      <div className="px-6 py-16 max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Your next hire is already ready to start
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Pre-built AI agents for specialist roles. They join your Slack, connect to your tools, build memory over time, and participate like real team members.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-24">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-6">Available roles</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <Link
              key={agent.slug}
              href={agent.available ? `/agents/${agent.slug}` : '#'}
              className={`group block rounded-xl border p-6 transition-all ${
                agent.available
                  ? 'border-zinc-700 bg-zinc-900 hover:border-zinc-500 hover:bg-zinc-800'
                  : 'border-zinc-800 bg-zinc-900/50 cursor-default opacity-60'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-200 shrink-0">
                  {agent.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-zinc-100">{agent.name}</span>
                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{agent.role}</span>
                    {!agent.available && (
                      <span className="text-xs text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded-full">Coming soon</span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2">{agent.tagline}</p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    {agent.tools.filter(t => t.required).map(t => (
                      <span key={t.name} className="text-xs text-zinc-600 flex items-center gap-1">
                        <Wrench size={10} />
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
