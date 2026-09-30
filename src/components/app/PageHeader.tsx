export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 px-4 pt-6 sm:px-6 sm:pt-8">
      <div className="min-w-0">
        <h1 className="text-[24px] font-semibold tracking-[-0.015em] sm:text-[26px]">{title}</h1>
        {description && <p className="mt-1 max-w-[70ch] text-[14.5px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
