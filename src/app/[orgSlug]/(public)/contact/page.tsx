import { notFound } from "next/navigation";
import { Clock, Mail, MapPin } from "lucide-react";
import { getOrgBySlug } from "@/lib/tenant";
import { DisplayHeading } from "@/components/theme/DisplayHeading";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <DisplayHeading className="text-4xl text-foreground">Contact Us</DisplayHeading>
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <div className="flex gap-4">
            <MapPin className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-semibold text-foreground">Community Center</p>
              <p className="text-sm text-muted-foreground">
                Legion Square Community Center
                <br />
                Los Santos, San Andreas
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Clock className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-semibold text-foreground">Open Hours</p>
              <p className="text-sm text-muted-foreground">
                Saturdays 9:00 AM – 2:00 PM
                <br />
                Donation drop-offs welcome
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Mail className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-semibold text-foreground">Write to Us</p>
              <p className="text-sm text-muted-foreground">
                outreach@{orgSlug.replace(/-/g, "")}foundation.org
              </p>
            </div>
          </div>
        </div>

        <form className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div>
            <label htmlFor="contact-name" className="mb-1 block text-sm font-medium text-card-foreground">
              Your name <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="mb-1 block text-sm font-medium text-card-foreground">
              Email <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="contact-message" className="mb-1 block text-sm font-medium text-card-foreground">
              Message <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-90"
          >
            Send Message
          </button>
          <p className="text-xs text-muted-foreground">
            Message delivery coming soon — for now, visit us on Saturdays.
          </p>
        </form>
      </div>
    </div>
  );
}
