import { AppShell } from "@/components/layout/app-shell";
import { AppStateProvider } from "@/components/providers/app-state";
import { getUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <AppStateProvider initialUser={user ? { id: user.id, email: user.email ?? null } : null}>
      <AppShell>{children}</AppShell>
    </AppStateProvider>
  );
}
