import type { CmsBlock } from "@/lib/cms";

// Paragraph HTML comes from Wagtail's rich-text pipeline (editor-authored,
// sanitised to the feature list in the model), so it is safe to inject.
export default function CmsBody({ blocks }: { blocks: CmsBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "heading")
          return (
            <h2 key={i} className="text-xl font-semibold mt-9 mb-3">
              {block.value}
            </h2>
          );
        if (block.type === "paragraph")
          return (
            <div
              key={i}
              className="cms-richtext"
              dangerouslySetInnerHTML={{ __html: block.value }}
            />
          );
        if (block.type === "image")
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={block.value.url}
              alt={block.value.alt}
              className="my-6 rounded-xl w-full"
            />
          );
        return (
          <aside
            key={i}
            className="my-6 rounded-xl border border-blue-100 bg-blue-50 p-5"
          >
            <strong className="block text-blue-900">{block.value.title}</strong>
            <p className="mt-1 text-slate-700">{block.value.text}</p>
          </aside>
        );
      })}
    </>
  );
}
