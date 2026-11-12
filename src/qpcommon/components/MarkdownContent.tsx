import { InlineCode } from "@ui";
import {
  Children,
  FunctionComponent,
  isValidElement,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components, type Options } from "react-markdown";
import "katex/dist/katex.min.css";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import Code from "./Code";
import "./Transcript.css";

interface MarkdownContentProps {
  content: string;
  doRehypeRaw?: boolean;
}

type Plugins = Options["rehypePlugins"];

const REMARK_PLUGINS: Plugins = [remarkGfm, remarkMath];

type CodeElementProps = { className?: string; children?: ReactNode };

/** A fenced block arrives as pre > code; its language is in the code's class. */
const codeOf = (children: ReactNode) => {
  const child = Children.toArray(children)[0];
  if (!isValidElement<CodeElementProps>(child)) return undefined;
  return {
    code: String(child.props.children ?? "").replace(/\n$/, ""),
    language: /language-(\S+)/.exec(child.props.className ?? "")?.[1],
  };
};

const end = (style?: CSSProperties) =>
  style?.textAlign === "right" ? " ns-cell--number" : "";

const COMPONENTS: Components = {
  a: ({ href, title, children }) => (
    <a href={href} title={title} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  pre: ({ children }) => {
    const block = codeOf(children);
    return block ? (
      <Code code={block.code} language={block.language} />
    ) : (
      <pre>{children}</pre>
    );
  },
  code: ({ children }) => <InlineCode>{children}</InlineCode>,
  // A paragraph holding only an image becomes a figure, captioned by its alt text.
  p: ({ node, children }) => {
    const only = node?.children.filter(
      (c) => !(c.type === "text" && c.value.trim() === ""),
    );
    const image = only?.length === 1 ? only[0] : undefined;
    if (image?.type !== "element" || image.tagName !== "img")
      return <p>{children}</p>;
    const alt = String(image.properties.alt ?? "");
    return (
      <figure className="chat-figure">
        <img src={String(image.properties.src ?? "")} alt={alt} />
        {alt && <figcaption>{alt}</figcaption>}
      </figure>
    );
  },
  table: ({ children }) => (
    <div
      className="ns-table-scroll"
      role="region"
      aria-label="Table"
      tabIndex={0}
    >
      <table className="ns-table ns-table--compact">{children}</table>
    </div>
  ),
  // GFM's right-aligned columns hold numbers.
  th: ({ children, style }) => (
    <th scope="col" className={`ns-table-head${end(style)}`}>
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td className={end(style) ? "ns-cell--number" : "ns-cell--text"}>
      {children}
    </td>
  ),
};

/** Markdown in the system's type: library tables, code blocks and inline code. */
const MarkdownContent: FunctionComponent<MarkdownContentProps> = ({
  content,
  doRehypeRaw,
}) => {
  const rehypePlugins = useMemo<Plugins>(
    () => (doRehypeRaw ? [rehypeKatex, rehypeRaw] : [rehypeKatex]),
    [doRehypeRaw],
  );
  return (
    <div className="chat-markdown">
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={rehypePlugins}
        components={COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
