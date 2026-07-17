import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import WelcomeTour from "@/components/WelcomeTour";

/**
 * Wraps the organizer app. Reads the signed-in user's showTour flag from the
 * DB (not the session cookie) so re-enabling it on the Account page takes
 * effect on the next page load.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  let showTour = false;
  if (session) {
    const org = await prisma.organizer.findUnique({
      where: { id: session.id },
      select: { showTour: true },
    });
    showTour = org?.showTour ?? false;
  }

  return (
    <>
      {children}
      {showTour && <WelcomeTour open />}
    </>
  );
}
