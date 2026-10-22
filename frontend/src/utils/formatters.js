export const money = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export const shortDate = (value) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(value));

export const pageButton = 'rounded-xl px-3.5 py-2.5 text-sm transition hover:bg-white/[0.07]';

export const fieldClass = 'mt-2 w-full rounded-xl border border-white/10 bg-[#061522] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-300/60';
