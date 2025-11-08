'use client'
import { cn } from "@/lib/util";
import { NumberField } from "@base-ui-components/react";
import { IconArrowsHorizontal } from "@tabler/icons-react";
import * as motion from 'motion/react-client'
import { useId, useState } from "react";


type NumberInputProps = {
  value?: number;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export default function NumberInput(
  { min, max, step, onChange, value, label, leftIcon, rightIcon }: NumberInputProps
) {

  const [focused, setFocused] = useState(false);

  const id = useId();
  return (<NumberField.Root
      id={id}
      value={value}
      required
      min={min}
      max={max}
      step={step}
      onValueChange={(value) => onChange?.(value)}
      className="flex flex-col items-start gap-0.5"
    >
      {label && <NumberField.ScrubArea className="cursor-ew-resize">
        <label
          htmlFor={id}
          className="cursor-ew-resize text-xs font-medium text-neutral-500"
        >
          {label}
        </label>
        <NumberField.ScrubAreaCursor className="drop-shadow-[0_1px_1px_#0008] filter">
          <IconArrowsHorizontal />
        </NumberField.ScrubAreaCursor>
      </NumberField.ScrubArea>}
      <NumberField.Group className="flex relative group items-center hover:bg-neutral-900 focus-within:z-1 focus-within:bg-neutral-900 text-neutral-300 pl-2">
        {leftIcon}
        <NumberField.Input 
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
            className={cn(
              "h-10 w-14 outline-none text-center text-base tabular-nums",
            )}
          />
          <motion.div
            className={cn("absolute right-0 left-0 bottom-0 h-[1px] bg-neutral-400 group-focus-within:h-[2px] group-focus-within:z-1 data transition-colors",
              focused && ' bg-white'
            )}  
            layout
            transition={{
              duration: 0.15,
            }}
            style={{
              height: focused ? 3 : 1,
            }}
            />
        
        {rightIcon}
        {/* <NumberField.Increment className="flex size-10 items-center justify-center rounded-tr-md rounded-br-md border border-gray-200 bg-gray-50 bg-clip-padding text-gray-900 select-none hover:bg-gray-100 active:bg-gray-100">
          <IconPlus />
        </NumberField.Increment> */}
      </NumberField.Group>
    </NumberField.Root>)
}