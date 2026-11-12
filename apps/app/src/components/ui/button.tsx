import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium select-none border-0 cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "btn-emphasis [--btn-accent:var(--primary)] text-white bg-linear-to-b from-(--btn-from) to-(--btn-to) ring ring-(--btn-ring) shadow-[inset_0_1px_0_0_var(--btn-bg),0_1px_2px_0_rgb(0_0_0/0.05)] not-disabled:hover:from-(--btn-bg) disabled:opacity-50",
        destructive:
          "btn-emphasis [--btn-accent:var(--destructive-emphasis)] text-white bg-linear-to-b from-(--btn-from) to-(--btn-to) ring ring-(--btn-ring) shadow-[inset_0_1px_0_0_var(--btn-bg),0_1px_2px_0_rgb(0_0_0/0.05)] not-disabled:hover:from-(--btn-bg) disabled:opacity-50",
        secondary:
          "bg-card text-foreground ring ring-line shadow-xs not-disabled:hover:bg-tint data-[state=open]:bg-card disabled:bg-card/50 disabled:text-foreground/70",
        outline:
          "bg-transparent text-foreground ring ring-line shadow-none not-disabled:hover:ring-control-focus/25 disabled:text-muted-foreground",
        ghost:
          "bg-transparent text-foreground shadow-none not-disabled:hover:bg-tint disabled:text-muted-foreground",
        link: "text-primary underline-offset-4 shadow-none hover:underline",
      },
      size: {
        xs: "h-6.5 gap-1 rounded-md px-2 text-xs [&_svg]:size-3.5 pointer-coarse:h-9",
        sm: "h-8 gap-1.5 rounded-md px-2.5 text-[13px] leading-5 [&_svg]:size-4 pointer-coarse:h-9",
        default: "h-9 gap-1.5 rounded-lg px-3 text-sm leading-5 [&_svg]:size-4",
        lg: "h-10 gap-2 rounded-lg px-4 text-sm leading-5 [&_svg]:size-4",
        icon: "size-9 rounded-lg p-0 [&_svg]:size-4",
        "icon-sm": "size-8 rounded-md p-0 [&_svg]:size-4 pointer-coarse:size-9",
        "icon-xs": "size-6.5 rounded-md p-0 [&_svg]:size-3.5 pointer-coarse:size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const resolvedVariant = variant ?? "default"
    const classes = cn(buttonVariants({ variant: resolvedVariant, size, className }))

    if (asChild) {
      return <Slot className={classes} ref={ref} {...props} />
    }

    return <button className={classes} ref={ref} {...props} />
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
