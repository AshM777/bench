'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Agent } from '@/lib/agents';
import { ArrowLeft, ArrowRight, CheckCircle, ExternalLink, Copy, Check } from 'lucide-react';

type Step = 'instructions' | 'tools' | 'setup' | 'done';

const STEPS: { id: Step; label: string }[] = [
  { id: 'instructions', label: 'Customise' },
  { id: 'tools', label: 'Authorise tools' },
  { id: 'setup', label: 'Setup guide' },
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
    .map(i => `${i.key}=${values[i.key] || ''}`)
    .join('\n');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <Link href={`/agents/${agent.slug}`} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
          <ArrowLeft size={16} />
          Back
        </Link>
        <span className="text-zinc-700">|</span>
        <span className="text-sm text-zinc-400">Hiring {agent.name} - {agent.role}</span>
      </nav>

      {/* Stepper */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 text-sm ${
                s.id === step ? 'text-zinc-100' :
                i < stepIndex ? 'text-green-500' : 'text-zinc-600'
              }`}>
                {i < stepIndex
                  ? <CheckCircle size={14} />
                  : <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                      s.id === step ? 'border-zinc-400 text-zinc-300' : 'border-zinc-700 text-zinc-600'
                    }`}>{i + 1}</div>
                }
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-zinc-800 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Step 1: Customise instructions */}
        {step === 'instructions' && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Customise {agent.name}</h2>
            <p className="text-zinc-400 text-sm mb-8">
              These are {agent.name}&apos;s instructions. Most are pre-configured - edit the ones specific to your team.
            </p>
            <div className="space-y-5">
              {agent.instructions.map((instruction) => (
                <div key={instruction.key}>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    {instruction.label}
                    {!instruction.editable && (
                      <span className="text-zinc-600 font-normal ml-2 text-xs">read only</span>
                    )}
                  </label>
                  {instruction.editable ? (
                    <input
                      type="text"
                      value={values[instruction.key]}
                      onChange={e => setValues(v => ({ ...v, [instruction.key]: e.target.value }))}
                      placeholder={instruction.label}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                  ) : (
                    <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-500">
                      {instruction.default}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Authorise tools */}
        {step === 'tools' && (
          <div>
            <h2 className="text-xl font-semibold mb-2">{agent.name} needs access to these tools</h2>
            <p className="text-zinc-400 text-sm mb-8">
              Required tools must be connected before {agent.name} can start. Optional tools unlock additional capabilities.
            </p>
            <div className="space-y-4">
              {agent.tools.map((tool) => (
                <div key={tool.name} className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                    {tool.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{tool.name}</span>
                      {tool.required
                        ? <span className="text-xs text-orange-400 bg-orange-950 px-2 py-0.5 rounded-full">Required</span>
                        : <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">Optional</span>
                      }
                    </div>
                    <p className="text-sm text-zinc-500">{tool.description}</p>
                  </div>
                  <div className="shrink-0">
                    <div className="text-xs text-zinc-600 bg-zinc-800 px-3 py-1.5 rounded-lg">
                      Connected in setup
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-4">
              Tool connections happen in the setup guide. Your credentials never leave your machine.
            </p>
          </div>
        )}

        {/* Step 3: Setup guide */}
        {step === 'setup' && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Get {agent.name} running</h2>
            <p className="text-zinc-400 text-sm mb-8">
              Follow these steps to bring {agent.name} online. Takes about 10 minutes.
            </p>

            <div className="space-y-6">
              {/* Step 1 */}
              <SetupStep number={1} title="Clone the Bench repo">
                <CodeBlock text="git clone https://github.com/AshM777/bench.git && cd bench && npm install" onCopy={copyToClipboard} copied={copied} id="clone" />
              </SetupStep>

              {/* Step 2 */}
              <SetupStep number={2} title="Set your environment variables">
                <p className="text-sm text-zinc-500 mb-3">
                  Copy your personalised config below into a <code className="text-zinc-300">.env</code> file in the bench directory.
                </p>
                <div className="relative">
                  <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-400 overflow-x-auto whitespace-pre-wrap">
                    {envBlock}
                    {'\n# Add your Slack and AWS credentials from .env.example'}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(envBlock, 'env')}
                    className="absolute top-3 right-3 text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    {copied === 'env' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </SetupStep>

              {/* Step 3 */}
              <SetupStep number={3} title="Set up Supabase">
                <p className="text-sm text-zinc-500 mb-3">
                  Create a free project at supabase.com, then run <code className="text-zinc-300">supabase-setup.sql</code> in the SQL editor.
                  Add your Supabase URL and service key to <code className="text-zinc-300">.env</code>.
                </p>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  Open Supabase <ExternalLink size={12} />
                </a>
              </SetupStep>

              {/* Step 4 */}
              <SetupStep number={4} title="Create a Slack app for Jordan">
                <p className="text-sm text-zinc-500 mb-3">
                  Go to api.slack.com/apps, create a new app from scratch named <strong className="text-zinc-300">Jordan</strong>.
                  Add these bot scopes: <code className="text-zinc-300">channels:history, channels:read, chat:write, groups:history, im:history, im:write, mpim:history, users:read</code>.
                  Enable Socket Mode, subscribe to <code className="text-zinc-300">message.channels, app_mention, message.im</code>.
                  Install to your workspace and copy the Bot Token, App Token, and Signing Secret into <code className="text-zinc-300">.env</code>.
                </p>
                <a
                  href="https://api.slack.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  Open Slack Apps <ExternalLink size={12} />
                </a>
              </SetupStep>

              {/* Step 5 */}
              <SetupStep number={5} title="Connect Google Sheets">
                <p className="text-sm text-zinc-500 mb-3">
                  Create a Desktop OAuth client in Google Cloud Console, add your sheets to <code className="text-zinc-300">SHEETS_CONFIG</code>, and run the seed data script to test.
                </p>
                <CodeBlock text="node --env-file=.env scripts/create-seed-data.js" onCopy={copyToClipboard} copied={copied} id="seed" />
              </SetupStep>

              {/* Step 6 */}
              <SetupStep number={6} title="Start Jordan">
                <CodeBlock text="npm run dev" onCopy={copyToClipboard} copied={copied} id="run" />
                <p className="text-sm text-zinc-500 mt-3">
                  Add Jordan to a Slack channel with <code className="text-zinc-300">/invite @Jordan</code> and say hello.
                </p>
              </SetupStep>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-950 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">{agent.name} is ready to join</h2>
            <p className="text-zinc-400 max-w-md mx-auto mb-8">
              Follow the setup guide to bring {agent.name} online. Once running, add {agent.name} to a Slack channel and they will start building context immediately.
            </p>
            <div className="space-y-3 max-w-sm mx-auto">
              <a
                href="https://github.com/AshM777/bench"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-zinc-100 text-zinc-950 font-semibold py-3 rounded-xl hover:bg-white transition-colors"
              >
                View on GitHub <ExternalLink size={14} />
              </a>
              <Link
                href="/"
                className="flex items-center justify-center gap-2 w-full border border-zinc-700 text-zinc-300 font-medium py-3 rounded-xl hover:border-zinc-500 transition-colors"
              >
                Back to marketplace
              </Link>
            </div>
          </div>
        )}

        {/* Nav buttons */}
        {step !== 'done' && (
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-zinc-800">
            <button
              onClick={back}
              disabled={stepIndex === 0}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 disabled:opacity-0 transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={next}
              className="flex items-center gap-2 bg-zinc-100 text-zinc-950 font-semibold px-6 py-2.5 rounded-xl hover:bg-white transition-colors text-sm"
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
      <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0 mt-0.5">
        {number}
      </div>
      <div className="flex-1">
        <p className="font-medium text-zinc-200 mb-2">{title}</p>
        {children}
      </div>
    </div>
  );
}

function CodeBlock({ text, onCopy, copied, id }: { text: string; onCopy: (t: string, k: string) => void; copied: string | null; id: string }) {
  return (
    <div className="relative">
      <pre className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-xs text-zinc-400 overflow-x-auto">
        {text}
      </pre>
      <button
        onClick={() => onCopy(text, id)}
        className="absolute top-2.5 right-3 text-zinc-600 hover:text-zinc-300 transition-colors"
      >
        {copied === id ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
      </button>
    </div>
  );
}
