"use client"

import React, {forwardRef} from 'react';
import { cn } from '@/lib/util';

export interface Props {
  children: React.ReactNode;
  columns?: number;
  style?: React.CSSProperties;
  horizontal?: boolean;
}

export const List = forwardRef<HTMLUListElement, Props>(
  ({children, columns = 1, horizontal, style}: Props, ref) => {
    return (
      <ul
        ref={ref}
        style={
          {
            ...style,
            '--columns': columns,
          } as React.CSSProperties
        }
        className={cn("grid auto-cols-max box-border min-w-[350px] gap-2.5 p-5 pb-0 m-2.5 rounded-sm min-h-[200px] transition-colors grid-cols-[repeat(var(--columns,1),1fr)] after:content-[''] after:h-2.5 after:col-start-[span_var(--columns,1)]", horizontal && "w-full grid-flow-col")}
      >
        {children}
      </ul>
    );
  }
);
List.displayName = 'List';