/**
 * Admin Dashboard - Stripe analytics overview
 */
import React from 'react';
import SoftBox from 'components/SoftBox';
import StripeAnalyticsDashboard from 'components/admin/StripeAnalyticsDashboard';
import Footer from 'examples/Footer';
import { contentPageShellFlexSx } from '../../theme/contentPaper';

const AdminDashboardPage: React.FC = () => {
  return (
    <>
      <SoftBox sx={contentPageShellFlexSx}>
        <StripeAnalyticsDashboard title="Analytics Dashboard" />
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default AdminDashboardPage;
