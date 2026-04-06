import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Icon from '@mui/material/Icon';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import Footer from 'examples/Footer';
import { useForumCategories, useForumThreads } from '../domains/forum';
import { ROUTE_PATHS } from '../config/routePaths';
import { contentPageShellSx, contentPaperSurfaceSx, contentPaperPageTitleSx } from '../theme/contentPaper';

const ForumPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: categories, isLoading: catLoading } = useForumCategories();
  const { data: threadsData, isLoading: threadsLoading } = useForumThreads();
  const threads = threadsData?.threads ?? [];
  const cats = categories ?? [];

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <SoftTypography sx={contentPaperPageTitleSx}>
            Forum
          </SoftTypography>
          <SoftButton variant="gradient" color="info" onClick={() => navigate(ROUTE_PATHS.FORUM_NEW_THREAD)} startIcon={<Icon>add</Icon>}>
            Nieuwe discussie
          </SoftButton>
        </SoftBox>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={contentPaperSurfaceSx}>
              <SoftBox p={3}>
                <SoftTypography variant="h6" fontWeight="bold" mb={2}>
                  Categorieën
                </SoftTypography>
                {catLoading ? (
                  <SoftTypography color="text">Loading...</SoftTypography>
                ) : (
                  <SoftBox component="ul" p={0} m={0} sx={{ listStyle: 'none' }}>
                    <SoftBox
                      component="li"
                      py={1}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1, px: 1 }}
                      onClick={() => navigate(ROUTE_PATHS.FORUM)}
                    >
                      <SoftTypography variant="button">All topics</SoftTypography>
                    </SoftBox>
                    {cats.map((c) => (
                      <SoftBox
                        key={c.$id}
                        component="li"
                        py={1}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1, px: 1 }}
                        onClick={() => navigate(ROUTE_PATHS.FORUM_CATEGORY.replace(':key', c.key))}
                      >
                        <SoftTypography variant="button">{c.name}</SoftTypography>
                        {c.description && (
                          <SoftTypography variant="caption" color="secondary" display="block">
                            {c.description}
                          </SoftTypography>
                        )}
                      </SoftBox>
                    ))}
                  </SoftBox>
                )}
              </SoftBox>
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card sx={contentPaperSurfaceSx}>
              <SoftBox p={3}>
                <SoftTypography variant="h6" fontWeight="bold" mb={2}>
                  Recente discussies
                </SoftTypography>
                {threadsLoading ? (
                  <SoftTypography color="text">Loading...</SoftTypography>
                ) : threads.length === 0 ? (
                  <SoftBox textAlign="center" py={3}>
                    <Icon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }}>forum</Icon>
                    <SoftTypography color="secondary">No discussions yet</SoftTypography>
                  </SoftBox>
                ) : (
                  <SoftBox component="ul" p={0} m={0} sx={{ listStyle: 'none' }}>
                    {threads.map((t) => (
                      <SoftBox
                        key={t.$id}
                        component="li"
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
              </SoftBox>
            </Card>
          </Grid>
        </Grid>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default ForumPage;
