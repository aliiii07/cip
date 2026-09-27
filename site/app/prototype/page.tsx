import { AppHeader } from "@/components/mvp/AppHeader";
import { Companies } from "@/components/mvp/Companies";
import { NasdaqHeatmap } from "@/components/mvp/NasdaqHeatmap";
import { SnapPages } from "@/components/mvp/SnapPages";
import { UzbekCompanies } from "@/components/mvp/UzbekCompanies";
import { MvpProvider } from "@/components/mvp/state";

/**
 * Three screens, one gesture apart. Page 1 is the field of fifty companies
 * on the landing's dark, the way in; page 2 is the NASDAQ 50 heatmap on the
 * landing's white grid; page 3 is Uzbek companies, coming soon. The picked
 * company is shared between pages.
 */
export default function AppPage() {
  return (
    <MvpProvider>
      <AppHeader />
      <SnapPages
        pages={[
          <Companies key="companies" />,
          <NasdaqHeatmap key="nasdaq-50" />,
          <UzbekCompanies key="uzbek" />,
        ]}
        tones={["dark", "light", "dark"]}
      />
    </MvpProvider>
  );
}
