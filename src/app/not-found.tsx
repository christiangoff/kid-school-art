import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold">We couldn't find that</h1>
      <p className="mt-2 text-muted">It may have been removed, or you may not have access to it.</p>
      <ButtonLink href="/" className="mt-4">Go home</ButtonLink>
    </div>
  );
}
