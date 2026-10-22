import { X } from 'lucide-react';

export default function Modal({ title, description, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label={title} className={`my-auto w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-3xl border border-white/10 bg-[#0b2030] p-5 shadow-2xl sm:p-7`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-full p-2 text-slate-400 hover:bg-white/10"><X size={19} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}
