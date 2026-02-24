import { useGridColumns, useGridRows } from "@/hooks/grid";
import { AnimatePresence } from "motion/react";
import * as motion from "motion/react-client";

import { cn } from "@/lib/util";

export default function Background() {
  const { rows, isPending: isPendingRows } = useGridRows();
  const { columns, isPending: isPendingColumns } = useGridColumns();
  if (isPendingRows || isPendingColumns) {
    return null;
  }
  return (
    <AnimatePresence>
      {!isPendingColumns && !isPendingRows && (
        <motion.div
          className={
            "shrink-0 col-span-full row-span-full grid grid-cols-[repeat(var(--col-count),1fr)] auto-rows-min h-full -z-1 pointer-events-none select-none overflow-hidden no-export outline outline-neutral-800 -outline-offset-1"
          }
          style={
            {
              width: columns * 128,
              height: rows * 128,
            } as React.CSSProperties
          }
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {Array.from({ length: rows * columns }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-32 h-32 bg-neutral-950 -z-1 border-neutral-800 -translate-x-[0.5px] -translate-y-[0.5px]",
                index % columns > 0 && "border-l",
                index >= columns && "border-t",
              )}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
