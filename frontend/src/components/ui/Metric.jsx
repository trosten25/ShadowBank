import Panel from './Panel.jsx';

export default function Metric({ label, value, icon: Icon, detail, tone = 'teal' }) {
  const tones = {
    teal: 'bg-teal-300/10 text-teal-200',
    amber: 'bg-amber-300/10 text-amber-200',
    blue: 'bg-sky-300/10 text-sky-200',
    green: 'bg-emerald-300/10 text-emerald-200',
  };

  return (
    <Panel>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={20} /></span>
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p>
      {detail && <p className="mt-2 text-xs text-slate-500">{detail}</p>}
    </Panel>
  );
}
