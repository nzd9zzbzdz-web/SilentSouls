import { Vote } from "lucide-react";
import { ComingSoon } from "@/components/portal/ComingSoon";

export default function VotesPage() {
  return (
    <ComingSoon
      icon={Vote}
      title="Votes"
      blurb="Prospect patches, promotions, and club decisions — settled the right way."
      detail="The voting system arrives with the prospect milestone: anonymous ballots, eligibility rules, and automatic outcomes."
    />
  );
}
