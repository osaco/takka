import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

/** زر تكة: ≥56dp، تركيز واضح، بلا أحمر صارخ. */
export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  const cls = variant === 'primary' ? 'takka-btn-primary' : 'takka-btn-secondary';
  return <button className={`${cls} ${className}`.trim()} {...rest} />;
}

export function Card({ className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`takka-card ${className}`.trim()} {...rest} />;
}

export function HintBox({ className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="note" className={`takka-hint ${className}`.trim()} {...rest} />;
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'التقدم'}>
      <div style={{ background: 'var(--fog)', borderRadius: 999, height: 14, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--journey)', transition: 'width 300ms' }} />
      </div>
      {label ? <div style={{ fontSize: 14, marginTop: 4 }}>{label}</div> : null}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgb(23 63 56 / 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="takka-card"
        style={{ maxWidth: 480, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="takka-section">{title}</h2>
        {children}
      </div>
    </div>
  );
}
