export default function Panel({ children, className = '' }) {
  return <section className={`rounded-2xl border border-white/10 bg-[#0b1d2b] p-5 sm:p-6 ${className}`}>{children}</section>;
}
