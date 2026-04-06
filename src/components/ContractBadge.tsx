import { Badge } from '@/components/ui/badge';
import { ContractStatus } from '@/types';

const cfg: Record<ContractStatus, string> = {
  'Active': 'bg-primary/20 text-primary border-primary/30',
  'Expiring Soon': 'bg-accent/20 text-accent border-accent/30',
  'Available': 'bg-destructive/20 text-destructive border-destructive/30',
};

export const ContractBadge = ({ status }: { status: ContractStatus }) => (
  <Badge variant="outline" className={cfg[status]}>{status}</Badge>
);
