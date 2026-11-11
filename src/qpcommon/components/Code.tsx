import { CodeBlock } from "@ui";
import { FunctionComponent } from "react";

const LANGUAGES: Record<string, "python" | "shell"> = {
  python: "python",
  py: "python",
  shell: "shell",
  sh: "shell",
  bash: "shell",
  console: "shell",
  zsh: "shell",
};

const NAMES: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  json: "JSON",
  html: "HTML",
  css: "CSS",
  yaml: "YAML",
  yml: "YAML",
};

interface CodeProps {
  code: string;
  language?: string;
  title?: string;
}

/** Maps a Markdown or tool language onto @ui CodeBlock: Python and shell are highlighted, the rest is plain. */
const Code: FunctionComponent<CodeProps> = ({ code, language, title }) => {
  const known = language ? LANGUAGES[language.toLowerCase()] : undefined;
  if (known) return <CodeBlock code={code} language={known} title={title} />;
  const name = language && (NAMES[language.toLowerCase()] ?? language);
  return <CodeBlock code={code} title={title ?? name ?? "Code"} />;
};

export default Code;
