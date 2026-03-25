import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { MoveableScrollAreaVertical } from "@/components/CompMovableScrollAreaVertical";

const README_FILES: Record<string, string> = {
  project: "README.md",
  settings: "README_SETTINGS.md",
  weather: "README_WEATHER.md",
  news: "README_NEWS.md",
  liveview: "README_LIVEVIEW.md",
  livetalk: "README_LIVETALK.md",
};

export default async function ReadmePage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>;
}) {
  const params = await searchParams;
  const doc = params.doc ?? "project";
  const filename = README_FILES[doc];

  if (!filename) {
    notFound();
  }

  const filePath = path.join(process.cwd(), filename);
  const fileContent = fs.readFileSync(filePath, "utf8");

  return (
    <MoveableScrollAreaVertical className="w-full p-5 markdown overflow-hidden">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
        {fileContent}
      </ReactMarkdown>
    </MoveableScrollAreaVertical>
  );
}