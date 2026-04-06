import React from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../config/routePaths';

/** @deprecated Use Support hub tickets tab */
const TicketsPage: React.FC = () => {
  return <Navigate to={ROUTE_PATHS.SUPPORT_TICKETS} replace />;
};

export default TicketsPage;
