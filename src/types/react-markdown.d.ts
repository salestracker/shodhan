declare module 'react-markdown' {
  import { ComponentType } from 'react';
  type ReactMarkdownProps = {
    children: string;
    remarkPlugins?: Array<unknown>;
    rehypePlugins?: Array<unknown>;
    components?: Record<string, ComponentType<object>>;
  };
  const ReactMarkdown: ComponentType<ReactMarkdownProps>;
  export default ReactMarkdown;
}

declare module 'remark-gfm' {
  const remarkGfm: unknown;
  export default remarkGfm;
}

declare module 'rehype-raw' {
  const rehypeRaw: unknown;
  export default rehypeRaw;
}
