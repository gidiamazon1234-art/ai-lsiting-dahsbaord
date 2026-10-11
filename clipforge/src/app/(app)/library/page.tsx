import { LibraryGrid } from "@/components/library/library-grid";

export const metadata = { title: "My Library" };

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">My Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every video you&apos;ve generated. Download links last one hour; refresh for new ones.</p>
      </div>
      <LibraryGrid />
    </div>
  );
}
