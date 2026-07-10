import { Shirt } from "lucide-react";
import { ComingSoon } from "@/components/portal/ComingSoon";

export default function MyCutPage() {
  return (
    <ComingSoon
      icon={Shirt}
      title="My Cut"
      blurb="Your vest, your story."
      detail="The digital cut renderer lands with the Digital Cut milestone — every patch you earn is already being placed on your vest behind the scenes, so nothing is lost."
    />
  );
}
