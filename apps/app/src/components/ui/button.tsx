import * as React from "react"
import { motion } from "motion/react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import type { Easing } from "motion/react"
import { durations, easings } from "@/lib/motion"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-gradient-to-b from-primary to-indigo-900 text-primary-foreground hover:from-primary/90 hover:to-primary/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-2",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
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

    if (resolvedVariant === "default" || resolvedVariant === "destructive") {
      return (
        <motion.button
          className={classes}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: durations.short, ease: easings.standard as Easing }}
          ref={ref}
          {...(props as object)}
        />
      )
    }

    return <button className={classes} ref={ref} {...props} />
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
