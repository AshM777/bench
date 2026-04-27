import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAgent } from '@/lib/agents';
import { ArrowLeft, CheckCircle, Circle, Wrench } from 'lucide-react';

export default async function AgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = getAgent(slug);
  if (!agent || !agent.available) notFound();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
          <ArrowLeft size={16} />
          Bench
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-start gap-5 mb-10">
          <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center text-lg font-bold text-zinc-200 shrink-0">
            {agent.avatar}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <span className="text-sm text-zinc-400 bg-zinc-800 px-3 py-1 rounded-full">{agent.role}</span>
            </div>
            <p className="text-zinc-400">{agent.tagline}</p>
            <p className="text-sm text-zinc-600 mt-1">{agent.experience} experience - {agent.previousRoles[0]}</p>
          </div>
        </div>

        {/* Example conversation */}
        <div className="mb-10">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-4">See Jordan in action</p>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
            {agent.exampleMessages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.from === 'jordan' ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  msg.from === 'jordan' ? 'bg-zinc-700 text-zinc-200' : 'bg-blue-900 text-blue-200'
                }`}>
                  {msg.from === 'jordan' ? agent.avatar : 'PM'}
                </div>
                <div className={`max-w-sm rounded-xl px-4 py-2.5 text-sm ${
                  msg.from === 'jordan'
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'bg-blue-950 text-blue-100'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="mb-10">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-4">About</p>
          <p className="text-zinc-400 leading-relaxed">{agent.bio}</p>
          <div className="mt-4 space-y-1">
            {agent.previousRoles.map((role, i) => (
              <div key={i} className="text-sm text-zinc-500 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-zinc-600" />
                {role}
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="mb-10">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-4">Skills</p>
          <div className="space-y-3">
            {agent.skills.map((skill, i) => (
              <div key={i} className="flex gap-3">
                <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-200">{skill.title}</p>
                  <p className="text-sm text-zinc-500">{skill.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="mb-12">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-4">Tools needed</p>
          <div className="space-y-3">
            {agent.tools.map((tool, i) => (
              <div key={i} className="flex items-start gap-3">
                {tool.required
                  ? <Wrench size={16} className="text-zinc-400 mt-0.5 shrink-0" />
                  : <Circle size={16} className="text-zinc-600 mt-0.5 shrink-0" />
                }
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    {tool.name}
                    {!tool.required && <span className="text-zinc-600 font-normal ml-2">optional</span>}
                  </p>
                  <p className="text-sm text-zinc-500">{tool.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="border-t border-zinc-800 pt-8">
          <Link
            href={`/hire/${agent.slug}`}
            className="inline-flex items-center justify-center w-full bg-zinc-100 text-zinc-950 font-semibold py-3 rounded-xl hover:bg-white transition-colors"
          >
            Hire {agent.name}
          </Link>
          <p className="text-center text-xs text-zinc-600 mt-3">
            You will review instructions and connect tools before Jordan joins your workspace.
          </p>
        </div>

      </div>
    </div>
  );
}
