import { ComingSoon } from "@/components/ComingSoon";

export default function Lab() {
  return (
    <ComingSoon
      page="Variant Lab"
      index={5}
      phase="P5"
      description="Hundreds of parameter variants per base strategy, two-stage failure funnel (overfitting, high drawdown, weak consistency, too few trades, bad risk:reward), survivors ranked by expectancy."
    />
  );
}
