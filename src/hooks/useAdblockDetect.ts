import { useEffect, useState } from "react";

export function useAdblockDetect(): { isAdblockEnabled: boolean } {
  const [isAdblockEnabled, setIsAdblockEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let detected = false;
    const flag = () => {
      if (detected) return;
      detected = true;
      setIsAdblockEnabled(true);
    };

    // Method 1 — DOM Baiting
    const bait = document.createElement("div");
    bait.className =
      "pub_300x250 pub_300x250m pub_728x90 ad-banner doubleclick";
    bait.style.cssText =
      "position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;";
    document.body.appendChild(bait);

    requestAnimationFrame(() => {
      const blocked =
        bait.offsetHeight === 0 ||
        bait.offsetWidth === 0 ||
        getComputedStyle(bait).display === "none";
      if (bait.parentNode) bait.parentNode.removeChild(bait);
      if (blocked) flag();
    });

    // Method 2 — Network Baiting with 2s timeout
    const timeout = new Promise<"timeout">((resolve) =>
      setTimeout(() => resolve("timeout"), 2000),
    );
    const probe = fetch(
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
      { method: "HEAD", mode: "no-cors", cache: "no-store" },
    )
      .then(() => "ok" as const)
      .catch(() => "blocked" as const);

    Promise.race([probe, timeout]).then((result) => {
      if (result === "blocked") flag();
    });
  }, []);

  return { isAdblockEnabled };
}
