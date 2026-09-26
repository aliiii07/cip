import { AppHeader } from "@/components/mvp/AppHeader";
import { NasdaqHeatmap } from "@/components/mvp/NasdaqHeatmap";
import { SnapPages } from "@/components/mvp/SnapPages";

/**
 * Two screens, one gesture apart. The first is the NASDAQ 50 heatmap, the
 * way in, on the landing's white grid; the second is reserved for the
 * research view and is empty until that ships.
 */
export default function AppPage() {
  return (
    <>
      <AppHeader />
      <SnapPages
        pages={[<NasdaqHeatmap key="nasdaq-50" />, <div key="research" className="h-full bg-parrot-dark" />]}
        tones={["light", "dark"]}
      />
    </>
  );
}
