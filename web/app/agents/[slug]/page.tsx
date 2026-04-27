import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAgent } from '@/lib/agents';
import { ArrowLeft } from 'lucide-react';

export default async function AgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = getAgent(slug);
  if (!agent || !agent.available) notFound();

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">

      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid #e0dcd6' }}>
        <Link href="/" className="flex items-center gap-2 text-[#888880] hover:text-[#1a1a1a] text-sm transition-colors">
          <ArrowLeft size={14} />
          Bench
        </Link>
        <span className="text-xs text-[#888880] font-mono">{agent.role}</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-14">

        {/* Header */}
        <div className="flex items-start gap-5 mb-12">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold shrink-0 text-white"
            style={{ background: '#1a1a1a' }}
          >
            {agent.avatar}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="font-serif text-3xl" style={{ fontFamily: 'var(--font-serif)' }}>{agent.name}</h1>
              <span
                className="text-xs px-3 py-1 rounded-full"
                style={{ background: '#f0ece7', color: '#888880', border: '1px solid #e0dcd6' }}
              >
                {agent.role}
              </span>
              <span
                className="text-xs px-3 py-1 rounded-full"
                style={{ background: '#dcfce7', color: '#166534' }}
              >
                Available now
              </span>
            </div>
            <p className="text-[#4a4a4a] leading-relaxed">{agent.tagline}</p>
            <p className="text-sm text-[#888880] mt-1">{agent.experience} - {agent.previousRoles[0]}</p>
          </div>
        </div>

        {/* Demo conversation */}
        <div className="mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888880] mb-5">See {agent.name} in action</p>
          <div className="rounded-2xl p-6 space-y-4" style={{ background: '#f5f3f0', border: '1px solid #e0dcd6' }}>
            <div className="flex items-center gap-2 text-xs text-[#888880] font-mono mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" style={{ boxShadow: '0 0 5px #22c55e80' }} />
              #growth
            </div>
            {agent.exampleMessages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.from !== 'jordan' ? 'flex-row-reverse' : ''}`}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                  style={msg.from === 'jordan'
                    ? { background: '#1a1a1a', color: 'white' }
                    : { background: '#e8e4de', color: '#4a4a4a' }
                  }
                >
                  {msg.from === 'jordan' ? agent.avatar : 'PM'}
                </div>
                <div
                  className="max-w-sm rounded-2xl px-4 py-3 text-sm leading-relaxed"
                  style={msg.from === 'jordan'
                    ? { background: '#1a1a1a', color: 'rgba(255,255,255,0.9)' }
                    : { background: 'white', color: '#1a1a1a', border: '1px solid #e0dcd6' }
                  }
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888880] mb-5">About</p>
          <p className="text-[#4a4a4a] leading-relaxed mb-5">{agent.bio}</p>
          <div className="space-y-2">
            {agent.previousRoles.map((role, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-[#888880]">
                <div className="w-1 h-1 rounded-full bg-[#e0dcd6]" />
                {role}
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888880] mb-5">Skills</p>
          <div className="space-y-4">
            {agent.skills.map((skill, i) => (
              <div key={i} className="flex gap-4 pb-4" style={{ borderBottom: i < agent.skills.length - 1 ? '1px solid #f0ece7' : 'none' }}>
                <div className="w-4 h-4 rounded-full bg-[#22c55e] flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div>
                  <p className="font-medium text-sm text-[#1a1a1a] mb-0.5">{skill.title}</p>
                  <p className="text-sm text-[#888880]">{skill.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888880] mb-5">Tools needed</p>
          <div className="space-y-3">
            {agent.tools.map((tool) => (
              <div
                key={tool.name}
                className="flex items-center gap-4 rounded-xl p-4"
                style={{ background: '#f5f3f0', border: '1px solid #e0dcd6' }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: '#e8e4de', color: '#4a4a4a' }}
                >
                  {tool.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1a1a1a]">{tool.name}</p>
                  <p className="text-xs text-[#888880]">{tool.description}</p>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full shrink-0"
                  style={tool.required
                    ? { background: '#fef3c7', color: '#92400e' }
                    : { background: '#f0ece7', color: '#888880' }
                  }
                >
                  {tool.required ? 'Required' : 'Optional'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="pt-8" style={{ borderTop: '1px solid #e0dcd6' }}>
          <Link
            href={`/hire/${agent.slug}`}
            className="flex items-center justify-center w-full py-4 rounded-2xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#1a1a1a' }}
          >
            Hire {agent.name}
          </Link>
          <p className="text-center text-xs text-[#888880] mt-3">
            You will review instructions and connect tools before {agent.name} joins your workspace.
          </p>
        </div>

      </div>
    </div>
  );
}
