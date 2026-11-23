import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
export function QuickAction({
  to,
  title,
  description,
  icon: Icon,
}: {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link className="panel quick-link" to={to}>
      <Icon />
      <h3>{title}</h3>
      <p>{description}</p>
    </Link>
  );
}
