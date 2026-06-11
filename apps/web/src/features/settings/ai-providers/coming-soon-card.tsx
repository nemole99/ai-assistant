import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";

interface ComingSoonCardProps {
  name: string;
  description: string;
}

export function ComingSoonCard({ name, description }: ComingSoonCardProps) {
  return (
    <Card className="opacity-60">
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary">Coming soon</Badge>
      </CardContent>
    </Card>
  );
}
