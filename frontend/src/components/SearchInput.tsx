import { memo, forwardRef } from 'react';
import './SearchInput.css';

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const SearchInput = memo(forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, placeholder, className = '', inputRef }, ref) => {
    // Usar inputRef si se proporciona, de lo contrario usar ref
    const inputRefToUse = inputRef || ref;
    
    return (
      <input
        ref={inputRefToUse}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`search-input ${className}`}
        autoComplete="off"
      />
    );
  }
), (prevProps, nextProps) => {
  // Solo re-renderizar si el valor cambia
  return prevProps.value === nextProps.value;
});

SearchInput.displayName = 'SearchInput';

