import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import Icon from '@mui/material/Icon';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import Footer from 'examples/Footer';
import { contentPageShellSx } from '../theme/contentPaper';
import { useForumCategories, useForumThreads } from '../domains/forum';
import { ROUTE_PATHS } from '../config/routePaths';

const ForumCategoryPage: React.FC = () => {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { data: categories } = useForumCategories();
  const category = (categories ?? []).find((c) => c.key === key);
  const categoryId = category?.$id;
  const { data: threadsData, isLoading } = useForumThreads(categoryId);
  const threads = threadsData?.threads ?? [];

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <SoftBox display="flex" alignItems="center" gap={1} mb={2}>
          <SoftButton size="small" variant="text" onClick={() => navigate(ROUTE_PATHS.FORUM)} startIcon={<Icon>arrow_back</Icon>}>
            Forum
          </SoftButton>
        </SoftBox>
        <SoftTypography variant="h4" fontWeight="bold" mb={2}>
          {category?.name ?? key ?? 'Categorie'}
        </SoftTypography>
        {category?.description && (
          <SoftTypography variant="body2" color="secondary" mb={2}>
            {category.description}
          </SoftTypography>
        )}

        <Card>
          {isLoading ? (
            <SoftBox p={3}>
              <SoftTypography color="text">Loading...</SoftTypography>
            </SoftBox>
          ) : threads.length === 0 ? (
            <SoftBox p={3} textAlign="center">
              <Icon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }}>forum</Icon>
              <SoftTypography color="secondary">No discussions in this category yet</SoftTypography>
            </SoftBox>
          ) : (
            <SoftBox component="ul" p={0} m={0} sx={{ listStyle: 'none' }}>
              {threads.map((t) => (
                <SoftBox
                  key={t.$id}
                  component="li"
                  px={3}
                  py={2}
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'grey.200',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => navigate(ROUTE_PATHS.FORUM_THREAD.replace(':id', t.$id))}
                >
                  <SoftTypography variant="button" fontWeight="bold">
                    {t.title}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="secondary">
                    {t.postCount} posts · {t.lastPostAt ? new Date(t.lastPostAt).toLocaleDateString('en-US') : new Date(t.$createdAt).toLocaleDateString('en-US')}
                  </SoftTypography>
                </SoftBox>
              ))}
            </SoftBox>
          )}
        </Card>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default ForumCategoryPage;
