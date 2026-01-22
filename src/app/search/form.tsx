"use client";

import Input from "@/components/input";
import { useRouter } from "next/navigation";

export default function SearchForm() {
  const router = useRouter()
  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const username = formData.get("query") as string;
    router.push(`/search?query=${encodeURIComponent(username)}`);
  }
  return (
    <form
      onSubmit={onSubmit}
      className="text-white flex flex-col gap-4 items-center z-10"
    >
      <Input name="query" label="Search" required placeholder="something" />
    </form>
  );
}
