import React from 'react';
import { cn } from "@/lib/utils"; // Assuming you have a utility for classnames (like in shadcn setup)
import { Button } from "@/components/ui/button"; // Using Button for hover/click effects
import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  /** Optional icon element (e.g., an SVG component or an emoji) */
  icon?: LucideIcon | React.ReactNode;
  /** The text label for the item */
  label: string;
  /** Optional click handler */
  onClick?: () => void;
  /** Optional flag to indicate if the item is currently active/selected */
  isActive?: boolean;
  /** Optional elements to render on the right side, typically shown on hover (e.g., buttons, dropdown triggers) */
  controls?: React.ReactNode;
  /** Additional class names for custom styling */
  className?: string;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon:Icon,
  label,
  onClick,
  isActive = false,
  controls,
  className,
}) => {
  return (
    <Button
      variant="ghost" // Use ghost variant for subtle hover
      onClick={onClick}
      className={cn(
        "group flex h-auto w-full items-center justify-start px-3 py-1.5 text-sm font-normal cursor-pointer border-y-1 ", // Base styles: flex, padding, text size
        "rounded-md", // Notion-like rounded corners
        isActive && "bg-accent text-accent-foreground", // Active state background
        "hover:bg-gray-200/50", // Subtle hover background
        className // Allow overriding/extending styles
      )}
    >
      {/* Icon */}
      <Icon />

      {/* Label */}
      <span className="ml-2 truncate" title={label} > {/* Truncate long labels */}
        {label}
      </span>

      {/* Controls (show on hover) */}
      {controls && (
        <div className="ml-2 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
          {controls}
        </div>
      )}
    </Button>
  );
};