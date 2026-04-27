'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Agent } from '@/lib/agents';
import { ArrowLeft, ArrowRight, ExternalLink, Copy, Check } from 'lucide-react';

type Step = 'instructions' | 'tools' | 'setup' | 'done';

const STEPS: { id: Step; label: string }[] = [
  { id: 'instructions', label: 'Customise' },
  { id: 'tools', label: 'Tools' },
  { id: 'setup', label: 'Setup' },
  { id: 'done', label: 'Done' },
];

export default function HireFlow({ agent }: { agent: Agent }) {
  const [step, setStep] = useState<Step>('instructions');
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(agent.instructions.map(i => [i.key, i.default]))
  );
  const [copied, setCopied] = useState<string | null>(null);

  const stepIndex = STEPS.findIndex(s => s.id === step);

  function next() {
    const nextStep = STEPS[stepIndex + 1];
    if (nextStep) setStep(nextStep.id);
  }

  function back() {
    const prevStep = STEPS[stepIndex - 1];
    if (prevStep) setStep(prevStep.id);
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const envBlock = agent.instructions
    .filter(i => i.editable)
    .map(i => `${i.key}=${values[i.key] || ''}`)
    .join('\n');

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">

      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid #e0dcd6' }}>
        <Link href={`/agents/${agent.slug}`} className="flex items-center gap-2 text-[#888880] hover:text-[#1a1a1a] text-sm transition-colors">
          <ArrowLeft size={14} />
          Back to {agent.name}
        </Link>
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              <button
                onClick={() => i <= stepIndex && setStep(s.id)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors ${
                  s.id === step
                    ? 'bg-[#1a1a1a] text-white'
                    : i < stepIndex
                    ? 'text-[#22c55e] cursor-pointer'
                    : 'text-[#888880] cursor-default'
                }`}
              >
                {i < stepIndex && <span>&#10003;</span>}
                {s.label}
              </button>
              {i < STEPS.length - 1 && <span className="text-[#e0dcd6] text-xs">/</span>}
            </div>
          ))}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Step 1: Customise */}
        {step === 'instructions' && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#888880] mb-3">Step 1 of 3</p>
            <h2 className="font-serif text-3xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
              Customise {agent.name}
            </h2>
            <p className="text-[#888880] text-sm mb-10">
              {agent.name}&apos;s core behaviour is pre-configured. Set the context specific to your team below.
            </p>
            <div className="space-y-6">
              {agent.instructions.map((instruction) => (
                <div key={instruction.key}>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                    {instruction.label}
                    {!instruction.editable && (
                      <span className="text-[#888880] font-normal ml-2 text-xs">pre-configured</span>
                    )}
                  </label>
                  {instruction.editable ? (
                    <input
                      type="text"
                      value={values[instruction.key]}
                      onChange={e => setValues(v => ({ ...v, [instruction.key]: e.target.value }))}
                      placeholder={`e.g. ${instruction.label}`}
                      className="w-full rounded-xl px-4 py-3 text-sm text-[#1a1a1a] placeholder-[#888880] focus:outline-none transition-colors"
                      style={{ background: '#f5f3f0', border: '1.5px solid #e0dcd6' }}
                      onFocus={e => (e.target.style.borderColor = '#1a1a1a')}
                      onBlur={e => (e.target.style.borderColor = '#e0dcd6')}
                    />
                  ) : (
                    <div
                      className="w-full rounded-xl px-4 py-3 text-sm text-[#888880] leading-relaxed"
                      style={{ background: '#f5f3f0', border: '1.5px solid #f0ece7' }}
                    >
                      {instruction.default}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Tools */}
        {step === 'tools' && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#888880] mb-3">Step 2 of 3</p>
            <h2 className="font-serif text-3xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
              {agent.name} needs these tools
            </h2>
            <p className="text-[#888880] text-sm mb-10">
              Required tools are connected in the setup guide. Optional tools unlock additional capabilities.
            </p>
            <div className="space-y-3 mb-8">
              {agent.tools.map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-center gap-4 rounded-xl p-5"
                  style={{ background: '#f5f3f0', border: '1.5px solid #e0dcd6' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: '#e8e4de', color: '#4a4a4a' }}
                  >
                    {tool.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-[#1a1a1a]">{tool.name}</p>
                    <p className="text-xs text-[#888880] mt-0.5">{tool.description}</p>
                  </div>
                  <span
                    className="text-xs px-3 py-1 rounded-full shrink-0 font-medium"
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
            <p className="text-xs text-[#888880] p-4 rounded-xl" style={{ background: '#f5f3f0', border: '1px solid #e0dcd6' }}>
              Your credentials are stored locally and never sent to Bench servers. {agent.name} runs on your own infrastructure.
            </p>
          </div>
        )}

        {/* Step 3: Setup */}
        {step === 'setup' && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#888880] mb-3">Step 3 of 3</p>
            <h2 className="font-serif text-3xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
              Get {agent.name} running
            </h2>
            <p className="text-[#888880] text-sm mb-10">
              About 10 minutes. You will need a Supabase account, a Slack app, and AWS credentials.
            </p>

            <div className="space-y-8">
              <SetupStep number={1} title="Clone and install">
                <CodeBlock text="git clone https://github.com/AshM777/bench.git && cd bench && npm install" onCopy={copyToClipboard} copied={copied} id="clone" />
              </SetupStep>

              <SetupStep number={2} title="Your personalised .env">
                <p className="text-sm text-[#888880] mb-3">
                  Copy this into a <code className="text-[#1a1a1a] font-mono text-xs">.env</code> file in the bench directory, then fill in the remaining Slack and AWS credentials from <code className="text-[#1a1a1a] font-mono text-xs">.env.example</code>.
                </p>
                <div className="relative">
                  <pre className="rounded-xl px-4 py-4 text-xs text-[#4a4a4a] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed" style={{ background: '#f5f3f0', border: '1px solid #e0dcd6' }}>
                    {envBlock || '# Fill in your company details in Step 1 to generate your .env'}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(envBlock, 'env')}
                    className="absolute top-3 right-3 text-[#888880] hover:text-[#1a1a1a] transition-colors"
                  >
                    {copied === 'env' ? <Check size={13} className="text-[#22c55e]" /> : <Copy size={13} />}
                  </button>
                </div>
              </SetupStep>

              <SetupStep number={3} title="Set up Supabase">
                <p className="text-sm text-[#888880] mb-3">
                  Create a free project, run <code className="text-[#1a1a1a] font-mono text-xs">supabase-setup.sql</code> in the SQL editor, add your URL and service key to <code className="text-[#1a1a1a] font-mono text-xs">.env</code>.
                </p>
                <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[#888880] hover:text-[#1a1a1a] transition-colors">
                  Open Supabase <ExternalLink size={11} />
                </a>
              </SetupStep>

              <SetupStep number={4} title="Create a Slack app for Jordan">
                <p className="text-sm text-[#888880] mb-3">
                  Create from scratch at api.slack.com/apps. Add scopes: <code className="text-[#1a1a1a] font-mono text-xs">channels:history, channels:read, chat:write, groups:history, im:history, im:write, users:read</code>. Enable Socket Mode. Subscribe to <code className="text-[#1a1a1a] font-mono text-xs">message.channels, app_mention, message.im</code>.
                </p>
                <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[#888880] hover:text-[#1a1a1a] transition-colors">
                  Open Slack Apps <ExternalLink size={11} />
                </a>
              </SetupStep>

              <SetupStep number={5} title="Start Jordan">
                <CodeBlock text="npm run dev" onCopy={copyToClipboard} copied={copied} id="run" />
                <p className="text-sm text-[#888880] mt-3">Then <code className="text-[#1a1a1a] font-mono text-xs">/invite @Jordan</code> in any Slack channel.</p>
              </SetupStep>

              <div className="pt-2">
                <a
                  href="https://bench-d81bb29f.mintlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[#888880] hover:text-[#1a1a1a] transition-colors"
                >
                  Read the full docs <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="text-center py-16">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-8"
              style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}
            >
              <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
                <path d="M2 9l7 7L22 2" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="font-serif text-3xl mb-3" style={{ fontFamily: 'var(--font-serif)' }}>
              {agent.name} is ready to join
            </h2>
            <p className="text-[#888880] max-w-sm mx-auto mb-10 leading-relaxed">
              Follow the setup guide to bring {agent.name} online. Once running, add {agent.name} to a channel and they will start building context immediately.
            </p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <a
                href="https://github.com/AshM777/bench"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ background: '#1a1a1a' }}
              >
                View on GitHub <ExternalLink size={13} />
              </a>
              <Link
                href="/"
                className="flex items-center justify-center py-3.5 rounded-2xl text-sm font-medium text-[#4a4a4a] hover:border-[#888880] transition-colors"
                style={{ border: '1.5px solid #e0dcd6' }}
              >
                Back to marketplace
              </Link>
            </div>
          </div>
        )}

        {/* Nav */}
        {step !== 'done' && (
          <div className="flex items-center justify-between mt-12 pt-8" style={{ borderTop: '1px solid #f0ece7' }}>
            <button
              onClick={back}
              disabled={stepIndex === 0}
              className="flex items-center gap-2 text-sm text-[#888880] hover:text-[#1a1a1a] disabled:opacity-0 transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={next}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ background: '#1a1a1a' }}
            >
              {stepIndex === STEPS.length - 2 ? 'Finish' : 'Continue'} <ArrowRight size={14} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function SetupStep({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-medium shrink-0 mt-0.5"
        style={{ background: '#f0ece7', color: '#888880', border: '1px solid #e0dcd6' }}
      >
        {number}
      </div>
      <div className="flex-1">
        <p className="font-medium text-[#1a1a1a] mb-3">{title}</p>
        {children}
      </div>
    </div>
  );
}

function CodeBlock({ text, onCopy, copied, id }: { text: string; onCopy: (t: string, k: string) => void; copied: string | null; id: string }) {
  return (
    <div className="relative">
      <pre
        className="rounded-xl px-4 py-3.5 text-xs font-mono text-[#4a4a4a] overflow-x-auto"
        style={{ background: '#f5f3f0', border: '1px solid #e0dcd6' }}
      >
        {text}
      </pre>
      <button
        onClick={() => onCopy(text, id)}
        className="absolute top-2.5 right-3 text-[#888880] hover:text-[#1a1a1a] transition-colors"
      >
        {copied === id ? <Check size={12} className="text-[#22c55e]" /> : <Copy size={12} />}
      </button>
    </div>
  );
}
