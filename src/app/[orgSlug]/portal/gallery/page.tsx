import { Image as ImageIcon } from "lucide-react";
import { ComingSoon } from "@/components/portal/ComingSoon";

export default function GalleryPage() {
  return (
    <ComingSoon
      icon={ImageIcon}
      title="Gallery"
      blurb="Ride photos, event shots, and the moments worth keeping."
      detail="Uploads with officer approval arrive with the gallery milestone. Approved public shots will also feed the foundation site."
    />
  );
}
