import { blockRegistry } from "./registry";

type BlockWithComponent = {
  id: string;
  data: unknown;
  component: { key: string };
};

export function BlockRenderer({ blocks }: { blocks: BlockWithComponent[] }) {
  return (
    <>
      {blocks.map((block) => {
        const Component = blockRegistry[block.component.key];
        if (!Component) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(`No block component registered for key "${block.component.key}"`);
          }
          return null;
        }
        return <Component key={block.id} {...(block.data as Record<string, unknown>)} />;
      })}
    </>
  );
}
