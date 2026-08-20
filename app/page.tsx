import { ComicReader } from "@/components/comic-reader";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <ComicReader />
    </div>
  );
}
