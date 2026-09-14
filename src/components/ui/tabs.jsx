import * as React from "react"
import { cn } from "cn"
import { Tabs as TabsPrimitive } from "radix-ui"

function Tabs({ className, ...props }) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props} />
}

function TabsList({ className, ...props }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full border border-border p-1 text-sm font-medium",
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted data-[state=active]:bg-accent data-[state=active]:text-primary",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn(className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
