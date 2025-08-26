"use client"

import React, {useEffect} from 'react';

import type {DraggableSyntheticListeners} from '@dnd-kit/core';
import type {Transform} from '@dnd-kit/utilities';

import styles from './album.module.scss';
import { cn } from '@/lib/util';

export interface AlbumProps {
  dragOverlay?: boolean;
  color?: string;
  disabled?: boolean;
  dragging?: boolean;
  handle?: boolean;
  height?: number;
  index?: number;
  fadeIn?: boolean;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  sorting?: boolean;
  transition?: string | null;
  wrapperStyle?: React.CSSProperties;
  value: {
    album: string
    img: string
    artist: string
    id: string
  };
  onRemove?(): void;
}

export const Album = React.memo(
  React.forwardRef<HTMLLIElement, AlbumProps>(
    (
      {
        color,
        dragOverlay,
        dragging,
        disabled,
        fadeIn,
        handle,
        height,
        index,
        listeners,
        onRemove,
        sorting,
        transition,
        transform,
        value,
        wrapperStyle,
        ...props
      },
      ref
    ) => {
      useEffect(() => {
        if (!dragOverlay) {
          return;
        }

        document.body.style.cursor = 'grabbing';

        return () => {
          document.body.style.cursor = '';
        };
      }, [dragOverlay]);

      return <li
          className={cn(
            styles.Wrapper,
            fadeIn && styles.fadeIn,
            sorting && styles.sorting,
            dragOverlay && styles.dragOverlay
          )}
          style={
            {
              ...wrapperStyle,
              transition: [transition, wrapperStyle?.transition]
                .filter(Boolean)
                .join(', '),
              '--translate-x': transform
                ? `${Math.round(transform.x)}px`
                : undefined,
              '--translate-y': transform
                ? `${Math.round(transform.y)}px`
                : undefined,
              '--scale-x': transform?.scaleX
                ? `${transform.scaleX}`
                : undefined,
              '--scale-y': transform?.scaleY
                ? `${transform.scaleY}`
                : undefined,
              '--index': index,
              '--color': color,
            } as React.CSSProperties
          }
          ref={ref}
        >
          <div
            className={cn(
              "flex grow items-center outline-none box-border list-none origin-center [-webkit-tap-highlight-color:transparent] font-normal whitespace-nowrap w-32 h-32 aspect-square relative transform-[scale(var(--scale,1))] transition-[box-shadow_200ms_cubic-bezier(0.18,0.67,0.6,1.22)] z-0 focus-visible:z-10 focus-visible:shadow-sm focus-visible:shadow-blue-500 ]",
              styles.album,
              dragging && styles.dragging,
              dragOverlay && styles.dragOverlay,
              disabled && styles.disabled,
              color && styles.color
            )}
            {...listeners}
            {...props}
            tabIndex={0}
          >
            <img src={value.img} className="w-full h-full object-cover" />
            <p className='absolute top-0 left-0 text-[7px] leading-[7px] line  text-white max-w-full text-wrap font-mono mix-blend-hard-light'>
              {value.artist} - {value.album}
            </p>
          </div>
        </li>
    }
  )
);