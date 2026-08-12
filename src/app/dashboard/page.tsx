import Link from "next/link";

// Placeholder dashboard; real content is owned by EXP-STORY-005+.
export default function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>
      <nav>
        <Link href="/manager">Manager area</Link>
      </nav>
    </main>
  );
}
