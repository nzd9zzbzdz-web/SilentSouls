import { redirect } from "next/navigation";

// Platform root — until custom domains (M9), send visitors to the first org.
export default function RootPage() {
  redirect("/silent-souls");
}
