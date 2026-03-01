import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

export default function ReadmePage() {
  const filePath = path.join(process.cwd(), "README.md");
  const fileContent = fs.readFileSync(filePath, "utf8");

  return (
    <div className="w-full p-5 markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
        {fileContent}
      </ReactMarkdown>
    </div>
  );
}