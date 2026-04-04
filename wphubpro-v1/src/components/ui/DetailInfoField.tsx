import React from 'react';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import { detailLabelSx, detailValueSx, detailLabelOnGradientSx, detailValueOnGradientSx } from '../../theme/detailPageStyles';

export interface DetailInfoFieldProps {
  label: string;
  children: React.ReactNode;
  /** White text on blue gradient (plugin-style info card) */
  onGradient?: boolean;
}

/** Label + value column for detail info cards */
const DetailInfoField: React.FC<DetailInfoFieldProps> = ({ label, children, onGradient }) => (
  <SoftBox>
    <SoftTypography component="span" sx={onGradient ? detailLabelOnGradientSx : detailLabelSx}>
      {label}
    </SoftTypography>
    <SoftTypography variant="body2" sx={onGradient ? detailValueOnGradientSx : detailValueSx}>
      {children}
    </SoftTypography>
  </SoftBox>
);

export default DetailInfoField;
