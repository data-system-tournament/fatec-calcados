import type { ButtonHTMLAttributes, ComponentProps } from "react";

// ComponentProps (e não ButtonHTMLAttributes) porque inclui `ref`, que no React 19 é uma prop comum.
type ButtonProps = ComponentProps<"button"> & {
  variant?: "default" | "dark";
  size?: "md" | "sm";
};

const base =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border font-medium " +
  "transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-40";

const variants = {
  default: "border-line-2 bg-surface enabled:hover:bg-subtle",
  dark: "border-ink bg-ink text-surface enabled:hover:border-ink-2 enabled:hover:bg-ink-2",
};

const sizes = {
  md: "px-3 py-[7px] text-[13px]",
  sm: "px-2.5 py-[5px] text-[12.5px]",
};

export function Button({ variant = "default", size = "md", className = "", ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}

export function LinkButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`p-0 text-[12.5px] font-medium text-muted underline underline-offset-[3px] hover:text-ink ${className}`}
      {...props}
    />
  );
}
