import { forwardRef } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface FormSelectProps {
  label: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  options: readonly string[] | { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export const FormSelect = forwardRef<HTMLButtonElement, FormSelectProps>(
  ({ label, error, required, placeholder, options, value, onValueChange, className }, ref) => {
    const inputId = label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-2">
        <Label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground flex items-center gap-1"
        >
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger
            ref={ref}
            id={inputId}
            className={cn(
              'input-large border-2 border-input bg-card transition-all duration-200',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              'data-[placeholder]:text-muted-foreground/60',
              error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
              className
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {options.map((option) => {
              const optionValue = typeof option === 'string' ? option : option.value;
              const optionLabel = typeof option === 'string' ? option : option.label;
              return (
                <SelectItem
                  key={optionValue}
                  value={optionValue}
                  className="text-base py-3 cursor-pointer hover:bg-accent"
                >
                  {optionLabel}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {error && (
          <p className="text-sm text-destructive animate-fade-in">{error}</p>
        )}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';
