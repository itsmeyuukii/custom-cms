import { auth } from "@/lib/auth";

export default async function AdminDashboard() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-semibold">
        Welcome{session?.user?.name ? `, ${session.user.name}` : ""}
      </h1>
      <p className="mt-2 text-gray-600">
        Role: {session?.user?.role ?? "unknown"}
      </p>
    </div>
  );
}
