import { Card } from "@/components/ui/card";

export function MetricCard({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <Card padding="md">
      <p className="text-[28px] font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-muted">{label}</p>
    </Card>
  );
}
