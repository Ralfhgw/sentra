import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";

export default function ReadmePage() {
  const filePath = path.join(process.cwd(), "README.md");
  const fileContent = fs.readFileSync(filePath, "utf8");

  return (
    <div className="markdown mx-auto p-8">
      <ReactMarkdown rehypePlugins={[rehypeSlug]}>
        {fileContent}
      </ReactMarkdown>
    </div>
  );
}