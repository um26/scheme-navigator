import { parseBlocks, parseInline } from "../lib/markdownLite";

function Inline({ line }) {
  return parseInline(line).map((seg, i) => {
    let node = seg.text;
    if (seg.bold) node = <strong key={i}>{node}</strong>;
    if (seg.italic) node = <em key={i}>{node}</em>;
    return <span key={i}>{node}</span>;
  });
}

// Renders the dataset's messy scraped markdown as clean, structured HTML — bullets,
// blockquotes, and bold/italic — instead of showing raw ** and > characters to the
// person reading it.
export default function RichText({ text, className = "" }) {
  const blocks = parseBlocks(text);
  if (blocks.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((block, i) => {
        if (block.type === "quote") {
          return (
            <blockquote key={i} className="border-l-2 border-saffron pl-3 text-ink/80 italic">
              {block.lines.map((l, j) => (
                <p key={j}>
                  <Inline line={l} />
                </p>
              ))}
            </blockquote>
          );
        }
        if (block.type === "bullets") {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {block.lines.map((l, j) => (
                <li key={j}>
                  <Inline line={l} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {block.lines.map((l, j) => (
              <span key={j}>
                <Inline line={l} />
                {j < block.lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
