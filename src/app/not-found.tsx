import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="text-6xl">💀</div>
      <h1 className="text-2xl font-bold">No body found</h1>
      <p className="text-muted">Could not autopsy this token.</p>
      <Link href="/" className="text-accent">← back</Link>
    </main>
  );
}
