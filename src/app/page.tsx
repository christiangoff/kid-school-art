import Link from "next/link";
import { redirect } from "next/navigation";
import { userCount } from "@/lib/accounts";
import { familiesFor, kidsOf, ROLE_LABELS } from "@/lib/families";
import { currentUser } from "@/lib/session";
import { ButtonLink, Card, KidAvatar, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await currentUser();
  if (!user) redirect(userCount() === 0 ? "/signup" : "/login");
  const families = familiesFor(user.id);
  if (families.length === 0) redirect("/families/new");
  if (families.length === 1) redirect(`/families/${families[0].id}`);

  return (
    <>
      <PageHeader
        title="Your families"
        actions={<ButtonLink href="/families/new" variant="secondary">New family</ButtonLink>}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {families.map((f) => (
          <Link key={f.id} href={`/families/${f.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{f.name}</h2>
                <span className="text-xs text-muted">{ROLE_LABELS[f.role]}</span>
              </div>
              <div className="mt-3 flex -space-x-2">
                {kidsOf(f.id).map((k) => (
                  <KidAvatar key={k.id} name={k.name} color={k.color} />
                ))}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
