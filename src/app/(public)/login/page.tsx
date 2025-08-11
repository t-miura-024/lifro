import { getServerAuthSession } from "@/auth";
import { redirect } from "next/navigation";
import LoginClient from "./_components/LoginClient";

export default async function LoginPage() {
  const session = await getServerAuthSession();
  if (session?.user) {
    redirect("/");
  }

  return <LoginClient />;
}
