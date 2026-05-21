import { HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AdblockModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-4 backdrop-blur-sm">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <HeartHandshake size={40} className="mx-auto mb-4 text-rose-500" />
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Keep Reflow Free Forever
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            We want to keep Reflow 100% free — better than the expensive market
            giants. To pay for our servers, we rely on a few carefully placed,
            non-annoying ads. Please pause your ad blocker to continue using the
            PDF Editor.
          </p>
          <Button
            variant="default"
            className="mt-6 w-full"
            onClick={() => window.location.reload()}
          >
            I've Disabled My Ad Blocker
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
