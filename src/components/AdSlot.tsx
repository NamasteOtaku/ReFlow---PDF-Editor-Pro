import { useEffect } from "react";

type Placement = "sidebar" | "header" | "footer";

const SLOT_IDS: Record<Placement, string> = {
  sidebar: "1234567890",
  header: "1234567891",
  footer: "1234567892",
};

const AD_CLIENT = "ca-pub-0000000000000000";

export function AdSlot({ placement }: { placement: Placement }) {
  useEffect(() => {
    try {
      // @ts-expect-error adsbygoogle is injected by the AdSense script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* no-op */
    }
  }, []);

  return (
    <div className="rounded-md border border-border bg-muted/30 p-1">
      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
        Sponsored
      </span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={SLOT_IDS[placement]}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
