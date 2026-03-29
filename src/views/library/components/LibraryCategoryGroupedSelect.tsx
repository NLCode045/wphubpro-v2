import {
  buildCategoryPathById,
  buildLibraryCategorySelectGroups,
  findLibraryCategorySelectValue,
  type LibraryCategoryOption,
} from '@/domains/library';
import type { LibraryCategory } from '@/types';
import { useMemo } from 'react';
import type { CSSObjectWithLabel, SingleValue } from 'react-select';
import Select from 'react-select';

type LibraryCategoryGroupedSelectProps = {
  categories: LibraryCategory[];
  value: string | null | undefined;
  onChange: (categoryId: string | null) => void;
  disabled?: boolean;
  'aria-label'?: string;
  placeholder?: string;
  /** Label for the empty value (value `''`). */
  noneOptionLabel: string;
  /** Group heading above the none option (UBold “Option Groups” pattern). */
  noneGroupLabel?: string;
  /** Limit options (e.g. valid parent folders when creating a subfolder). */
  includeOnlyIds?: Set<string>;
  className?: string;
  /** Match `form-select-sm` height loosely. */
  size?: 'sm' | 'default';
  /** Minimum width of the control (e.g. table column). */
  minWidth?: string | number;
};

const menuPortalStyles = {
  menuPortal: (base: CSSObjectWithLabel) => ({ ...base, zIndex: 2000 }),
};

function smControl(base: CSSObjectWithLabel): CSSObjectWithLabel {
  return {
    ...base,
    minHeight: 31,
    fontSize: '0.875rem',
  };
}

const LibraryCategoryGroupedSelect = ({
  categories,
  value,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  placeholder = 'Select…',
  noneOptionLabel,
  noneGroupLabel,
  includeOnlyIds,
  className = '',
  size = 'default',
  minWidth,
}: LibraryCategoryGroupedSelectProps) => {
  const pathById = useMemo(() => buildCategoryPathById(categories), [categories]);

  const groups = useMemo(
    () =>
      buildLibraryCategorySelectGroups(categories, pathById, {
        ...(noneOptionLabel != null
          ? {
              noneOption: { value: '', label: noneOptionLabel },
              noneGroupLabel,
            }
          : {}),
        includeOnlyIds,
      }),
    [categories, pathById, noneOptionLabel, noneGroupLabel, includeOnlyIds],
  );

  const selected = useMemo(() => findLibraryCategorySelectValue(groups, value), [groups, value]);

  const styles = useMemo(() => {
    const control = (base: CSSObjectWithLabel) => {
      let b = size === 'sm' ? smControl(base) : base;
      if (minWidth != null) {
        b = { ...b, minWidth };
      }
      return b;
    };
    return { ...menuPortalStyles, control };
  }, [size, minWidth]);

  return (
    <Select<LibraryCategoryOption, false>
      className={`react-select ${className}`.trim()}
      classNamePrefix="react-select"
      placeholder={placeholder}
      options={groups}
      value={selected}
      onChange={(opt: SingleValue<LibraryCategoryOption>) => {
        const v = opt?.value ?? '';
        onChange(v === '' ? null : v);
      }}
      isDisabled={disabled}
      isSearchable
      isClearable={false}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      styles={styles}
      aria-label={ariaLabel}
    />
  );
};

export default LibraryCategoryGroupedSelect;
