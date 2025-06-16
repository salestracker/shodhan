declare module 'react-markdown' {
  import { FC, ReactNode } from 'react';
  interface ReactMarkdownProps {
    children?: string;
    remarkPlugins?: Array<unknown>;
    className?: string;
    components?: {
      [nodeType: string]: React.ElementType<{
        node?: unknown;
        children?: React.ReactNode;
      }>;
    };
  }
  const ReactMarkdown: FC<ReactMarkdownProps>;
  export default ReactMarkdown;
}

declare module 'remark-gfm';
