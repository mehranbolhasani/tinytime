import * as React from "react"

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full min-w-0 border-0 bg-control text-foreground ring ring-line shadow-xs outline-none transition-[box-shadow,color] duration-150 placeholder:text-muted-foreground/70 focus-visible:ring-[1.5px] focus-visible:ring-control-focus/50 disabled:cursor-not-allowed disabled:bg-control/50 disabled:text-muted-foreground aria-invalid:ring-destructive aria-invalid:focus-visible:ring-destructive/50 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
  {
    variants: {
      size: {
        sm: "h-8 rounded-md px-2.5 text-base md:text-[13px]",
        default: "h-9 rounded-lg px-3 text-base md:text-sm",
        lg: "h-10 rounded-lg px-4 text-base md:text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
