import { cn } from "@/lib/utils";

type MenuToggleIconProps = React.ComponentProps<"div"> & {
  open: boolean;
  duration?: number;
};

export function MenuToggleIcon({
  open,
  duration = 300,
  className,
  ...props
}: MenuToggleIconProps) {
  const bar = "h-0.5 w-full rounded-full bg-foreground transition-all";
  const durationInS = duration / 1000;

  return (
    <div
      className={cn("relative size-full", className)}
      style={
        {
          "--duration": `${durationInS}s`,
        } as React.CSSProperties
      }
      {...props}
    >
      <div
        className={cn(bar, "absolute top-[25%] transform")}
        style={{
          transform: open
            ? "rotate(45deg) translate(0, 125%)"
            : "rotate(0deg) translate(0, 0)",
          transitionDuration: `${durationInS}s`,
        }}
      />
      <div
        className={cn(bar, "absolute top-1/2 transform")}
        style={{
          opacity: open ? 0 : 1,
          transitionDuration: `${durationInS}s`,
        }}
      />
      <div
        className={cn(bar, "absolute top-[75%] transform")}
        style={{
          transform: open
            ? "rotate(-45deg) translate(0, -125%)"
            : "rotate(0deg) translate(0, 0)",
          transitionDuration: `${durationInS}s`,
        }}
      />
    </div>
  );
}
