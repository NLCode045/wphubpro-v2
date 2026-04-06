/**
 * Scrollable container with optional up/down arrow buttons when content overflows.
 */
import React, { useRef } from 'react';
import Icon from '@mui/material/Icon';
import IconButton from '@mui/material/IconButton';
import SoftBox from 'components/SoftBox';

const SCROLL_STEP = 80;

interface ScrollableBoxProps {
  children: React.ReactNode;
  /** Fixed max height (e.g. "320px"). Ignored when fill is true. */
  maxHeight?: string;
  /** When true, fill parent height (flex: 1 minHeight: 0). Use when parent has constrained height. */
  fill?: boolean;
  showArrows?: boolean;
  arrowColor?: string;
  sx?: object;
}

const ScrollableBox: React.FC<ScrollableBoxProps> = ({
  children,
  maxHeight,
  fill = false,
  showArrows = false,
  arrowColor = 'text.secondary',
  sx = {},
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <SoftBox sx={{ display: 'flex', flexDirection: 'column', flex: fill ? 1 : undefined, minHeight: fill ? 0 : undefined, height: fill ? '100%' : undefined, alignItems: 'stretch', overflow: 'hidden', ...sx }}>
      <SoftBox
        ref={scrollRef}
        sx={{
          flex: 1,
          minHeight: 0,
          height: fill ? '100%' : undefined,
          maxHeight: fill ? undefined : maxHeight,
          overflowY: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {children}
      </SoftBox>
      {showArrows && (
        <SoftBox
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 0.5,
            py: 1,
          }}
        >
          <IconButton
            size="small"
            onClick={() => scrollRef.current?.scrollBy({ top: -SCROLL_STEP, behavior: 'smooth' })}
            sx={{ color: arrowColor }}
            aria-label="Scroll up"
          >
            <Icon fontSize="small">keyboard_arrow_up</Icon>
          </IconButton>
          <IconButton
            size="small"
            onClick={() => scrollRef.current?.scrollBy({ top: SCROLL_STEP, behavior: 'smooth' })}
            sx={{ color: arrowColor }}
            aria-label="Scroll down"
          >
            <Icon fontSize="small">keyboard_arrow_down</Icon>
          </IconButton>
        </SoftBox>
      )}
    </SoftBox>
  );
};

export default ScrollableBox;
