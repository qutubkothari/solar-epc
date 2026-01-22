type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold text-solar-ink">{title}</h2>
        {subtitle && <p className="text-sm text-solar-muted mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
