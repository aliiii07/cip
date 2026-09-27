import { AppHeader } from "@/components/mvp/AppHeader";
import { Companies } from "@/components/mvp/Companies";
import { NasdaqHeatmap } from "@/components/mvp/NasdaqHeatmap";
import { SnapPages } from "@/components/mvp/SnapPages";
import { MvpProvider } from "@/components/mvp/state";

/**
 * Four screens, one gesture apart. Page 1 is the field of fifty companies
 * on the landing's dark, the way in; page 2 is the NASDAQ 50 heatmap on the
 * landing's white grid; pages 3 and 4 are reserved and empty until they
 * ship. The picked company is shared between pages.
 */
export default function AppPage() {
  return (
    <MvpProvider>
      <AppHeader />
      <SnapPages
        pages={[
          <Companies key="companies" />,
          <NasdaqHeatmap key="nasdaq-50" />,
          <div key="page-3" className="h-full bg-parrot-dark" />,
          <div key="page-4" className="h-full bg-parrot-dark" />,
        ]}
        tones={["dark", "light", "dark", "dark"]}
      />
    </MvpProvider>
  );
}
