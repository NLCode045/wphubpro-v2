/**
 * @deprecated Redirects to Support mailbox
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../config/routePaths';

const MessagesPage: React.FC = () => {
  return <Navigate to={ROUTE_PATHS.SUPPORT_MAIL} replace />;
};

export default MessagesPage;
