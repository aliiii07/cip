import { ComingSoon } from "@/components/ComingSoon";

export default function Monitor() {
  return (
    <ComingSoon
      page="Monitor"
      phase="P7"
      description="Bar-close evaluation loop for approved and watchlisted strategies, live stage wheel over SSE, alerts for setups, paper fills, stops, targets, gate breaches, and data gaps. Continuous while the service is running."
    />
  );
}
