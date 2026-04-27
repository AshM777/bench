import Link from 'next/link';
import { agents } from '@/lib/agents';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">

      {/* Floating nav pill */}
      <div className="sticky top-4 z-50 flex justify-center px-6">
        <nav
          className="flex items-center justify-between gap-8 px-6 py-3 rounded-full w-full max-w-3xl"
          style={{
            background: 'rgba(7,11,23,0.72)',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 12px 36px rgba(0,0,0,0.28), inset 0 1px rgba(255,255,255,0.16)',
            backdropFilter: 'blur(20px) saturate(1.4)',
          }}
        >
          <div className="flex items-center gap-2">
            {/* B logo mark */}
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
              <span className="text-[#1a1a1a] font-bold text-sm" style={{ fontFamily: 'var(--font-serif)' }}>B</span>
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">Bench</span>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <a href="https://bench-d81bb29f.mintlify.app/" target="_blank" rel="noopener noreferrer" className="text-[rgba(255,255,255,0.65)] hover:text-white text-sm transition-colors">Docs</a>
            <a href="https://github.com/AshM777/bench" target="_blank" rel="noopener noreferrer" className="text-[rgba(255,255,255,0.65)] hover:text-white text-sm transition-colors">GitHub</a>
          </div>
          <Link
            href="/agents/jordan"
            className="text-sm font-medium px-4 py-1.5 rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.14)' }}
          >
            Meet Jordan
          </Link>
        </nav>
      </div>

      {/* Hero */}
      <div className="pt-16 pb-8 text-center px-6">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-8"
          style={{ background: '#f0ece7', color: '#888880', border: '1px solid #e0dcd6' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" style={{ boxShadow: '0 0 6px #22c55e99' }} />
          Now live - Jordan, Data Analyst
        </div>

        <h1
          className="font-serif text-[clamp(2.8rem,7vw,5rem)] leading-[1.1] max-w-3xl mx-auto mb-6"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Your next hire is already ready to start
        </h1>

        <p className="text-[#4a4a4a] text-[clamp(1rem,2vw,1.2rem)] max-w-xl mx-auto mb-4 leading-relaxed">
          Pre-built AI agents for specialist roles. They join your Slack, connect to your tools, and build memory over time.
        </p>
        <p className="text-[#888880] text-base max-w-md mx-auto mb-10 leading-relaxed">
          No configuration. No prompting. Just onboard them like a new hire - add them to the right channels, share the docs they need, and let them get to work.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/agents/jordan"
            className="px-6 py-3 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-85"
            style={{ background: '#1a1a1a' }}
          >
            Hire your first agent
          </Link>
          <a
            href="https://github.com/AshM777/bench"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-full text-sm font-medium text-[#4a4a4a] transition-all hover:border-[#888880]"
            style={{ background: 'white', border: '1px solid #e0dcd6' }}
          >
            View on GitHub
          </a>
        </div>
      </div>

      {/* Demo conversation */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#888880] mb-8">The moment that matters</p>
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ background: '#f5f3f0', border: '1px solid #e0dcd6' }}
        >
          <div className="flex items-start gap-2 text-xs text-[#888880] font-mono mb-2">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] mt-1 shrink-0" style={{ boxShadow: '0 0 5px #22c55e80' }} />
            #growth
          </div>
          {[
            { from: 'PM', text: "DAU is down 12% this week. Pretty sure it's the new onboarding change we shipped Thursday.", human: true },
            { from: 'Jordan', text: "Worth checking before we anchor on that. The drop started Tuesday, two days before the onboarding change shipped. It lines up closer with the App Store rating dip (3.8 to 3.2) on Monday evening. Here's the DAU vs. rating overlay for the last 30 days.", human: false },
            { from: 'PM', text: "Wait, really? Can you pull the cohort breakdown?", human: true },
            { from: 'Jordan', text: "New users that week dropped 18%, existing user retention held flat at 94%. The new user drop tracks with the rating - that's almost always the first thing people check before downloading. Want me to pull activation for the same period?", human: false },
          ].map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.human ? 'flex-row-reverse' : ''}`}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={msg.human
                  ? { background: '#e8e4de', color: '#4a4a4a' }
                  : { background: '#1a1a1a', color: 'white' }
                }
              >
                {msg.human ? 'PM' : 'JO'}
              </div>
              <div
                className="max-w-sm rounded-2xl px-4 py-3 text-sm leading-relaxed"
                style={msg.human
                  ? { background: 'white', color: '#1a1a1a', border: '1px solid #e0dcd6' }
                  : { background: '#1a1a1a', color: 'rgba(255,255,255,0.9)' }
                }
              >
                {msg.text}
              </div>
            </div>
          ))}
          <p className="text-center text-xs text-[#888880] pt-2">Jordan was never asked to watch the channel. Jordan was just there.</p>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#888880] mb-12">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ background: '#e0dcd6' }}>
          {[
            { step: '01', title: 'Pick a role', body: 'Browse the marketplace. Each agent has a defined role, skill set, and the tools they need. Read their profile like a CV.' },
            { step: '02', title: 'Onboard them', body: 'Connect their tools, set your company context. Takes 10 minutes. No prompting, no configuration, no engineering.' },
            { step: '03', title: 'They get to work', body: 'Add them to Slack channels. They read, listen, build context, and start participating - proactively, not just when mentioned.' },
          ].map((item) => (
            <div key={item.step} className="bg-white p-8">
              <p className="font-mono text-xs text-[#888880] mb-4">{item.step}</p>
              <h3
                className="font-serif text-2xl mb-3"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {item.title}
              </h3>
              <p className="text-[#888880] text-sm leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* The moat */}
      <div className="py-20 px-6" style={{ background: '#0c0c0c' }}>
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888880] mb-6">Why this works</p>
          <h2
            className="font-serif text-[clamp(2rem,4vw,3rem)] text-white leading-tight mb-6"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            The moat is not the AI.<br />
            <span className="italic">It&apos;s the memory.</span>
          </h2>
          <p className="text-[rgba(255,255,255,0.5)] text-base leading-relaxed max-w-lg mx-auto">
            Every message your agent reads, every document it indexes, every decision it witnesses becomes part of its context. By month three, removing Jordan feels like offboarding a real hire.
          </p>
        </div>
      </div>

      {/* Agent marketplace */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#888880] mb-2">The roster</p>
        <h2
          className="font-serif text-[clamp(1.8rem,3.5vw,2.8rem)] mb-10"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Who would you like to hire?
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <Link
              key={agent.slug}
              href={agent.available ? `/agents/${agent.slug}` : '#'}
              className={`group block rounded-2xl p-6 transition-all ${agent.available ? 'cursor-pointer' : 'cursor-default opacity-50'}`}
              style={{
                background: '#f5f3f0',
                border: agent.available ? '1.5px solid #e0dcd6' : '1.5px solid #e8e4de',
              }}
              onMouseEnter={undefined}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={agent.available
                    ? { background: '#1a1a1a', color: 'white' }
                    : { background: '#e8e4de', color: '#888880' }
                  }
                >
                  {agent.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-[#1a1a1a]">{agent.name}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: '#e8e4de', color: '#888880' }}
                    >
                      {agent.role}
                    </span>
                    {agent.available
                      ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#166534' }}>Available</span>
                      : <span className="text-xs text-[#888880]">Coming soon</span>
                    }
                  </div>
                  <p className="text-sm text-[#4a4a4a] leading-snug">{agent.tagline}</p>
                  {agent.available && (
                    <div className="flex items-center gap-3 mt-3">
                      {agent.tools.filter(t => t.required).map(t => (
                        <span key={t.name} className="text-xs text-[#888880] font-mono">{t.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Pricing strip */}
      <div className="px-6 py-16" style={{ background: '#f5f3f0', borderTop: '1px solid #e0dcd6' }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888880] mb-4">Pricing</p>
          <h2
            className="font-serif text-[clamp(1.8rem,3.5vw,2.8rem)] mb-3"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Less than a coffee per day
          </h2>
          <p className="text-[#888880] text-base mb-10">A specialist costs $80k a year. Jordan costs $49 a month.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { name: 'Free', price: '$0', desc: '1 agent, 500 messages/month. Enough to see if Jordan knows your product better than you do.' },
              { name: 'Pro', price: '$49', period: '/agent/mo', desc: 'Full integrations, proactive participation, persistent memory, write-back reporting.', highlight: true },
              { name: 'Self-hosted', price: '$299', period: '/agent/yr', desc: 'Run everything on your own infrastructure. Your data never leaves your machine.' },
            ].map((tier) => (
              <div
                key={tier.name}
                className="rounded-2xl p-6 text-left"
                style={tier.highlight
                  ? { background: '#1a1a1a', border: '1.5px solid #1a1a1a' }
                  : { background: 'white', border: '1.5px solid #e0dcd6' }
                }
              >
                <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${tier.highlight ? 'text-[#888880]' : 'text-[#888880]'}`}>{tier.name}</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className={`font-serif text-4xl ${tier.highlight ? 'text-white' : 'text-[#1a1a1a]'}`} style={{ fontFamily: 'var(--font-serif)' }}>{tier.price}</span>
                  {tier.period && <span className={`text-sm ${tier.highlight ? 'text-[#888880]' : 'text-[#888880]'}`}>{tier.period}</span>}
                </div>
                <p className={`text-sm leading-relaxed ${tier.highlight ? 'text-[rgba(255,255,255,0.6)]' : 'text-[#888880]'}`}>{tier.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-6 py-20 text-center" style={{ borderTop: '1px solid #e0dcd6' }}>
        <h2
          className="font-serif text-[clamp(2rem,4vw,3.2rem)] mb-4 max-w-lg mx-auto"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Your team is missing someone
        </h2>
        <p className="text-[#888880] mb-8">Hire Jordan today. They&apos;re already ready to start.</p>
        <Link
          href="/agents/jordan"
          className="inline-flex items-center px-8 py-3.5 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-85"
          style={{ background: '#1a1a1a' }}
        >
          Hire Jordan, Data Analyst
        </Link>
      </div>

      {/* Footer */}
      <footer className="px-6 py-8" style={{ borderTop: '1px solid #e0dcd6', background: '#f5f3f0' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center">
              <span className="text-white font-bold text-xs" style={{ fontFamily: 'var(--font-serif)' }}>B</span>
            </div>
            <span className="text-sm font-semibold">Bench</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://bench-d81bb29f.mintlify.app/" target="_blank" rel="noopener noreferrer" className="text-sm text-[#888880] hover:text-[#1a1a1a] transition-colors">Docs</a>
            <a href="https://github.com/AshM777/bench" target="_blank" rel="noopener noreferrer" className="text-sm text-[#888880] hover:text-[#1a1a1a] transition-colors">GitHub</a>
          </div>
          <p className="text-xs text-[#888880]">MIT License. Open source.</p>
        </div>
      </footer>

    </div>
  );
}
