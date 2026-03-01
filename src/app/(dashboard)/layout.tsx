// DEV MODE: auth bypassed — mock user hardcoded
import { Sidebar } from "./sidebar";

const user = { id: "dev-user", email: "dev@viral.local" };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar email={user.email} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
