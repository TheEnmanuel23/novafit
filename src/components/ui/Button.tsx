
import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'primary', size = 'md', ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-95 transition-transform duration-75",
        {
          'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20': variant === 'primary',
          'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
          'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground': variant === 'outline',
          'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20': variant === 'destructive',
          'h-9 px-4 py-2 text-sm': size === 'sm',
          'h-12 px-6 py-3 text-lg': size === 'md', // Default size for tablet friendliness
          'h-16 px-8 text-xl': size === 'lg', // Big buttons for check-in
          'h-12 w-12': size === 'icon',
        },
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button };
