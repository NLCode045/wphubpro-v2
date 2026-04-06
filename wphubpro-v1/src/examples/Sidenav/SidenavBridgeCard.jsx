/**
 * Small card above the user profile in Sidenav: latest WPHubPro Bridge plugin for download.
 */
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import Icon from "@mui/material/Icon";
import { useSoftUIController } from "context";
import { useLatestBridge } from "../../hooks/useLatestBridge";

const cardGradient = "linear-gradient(310deg, #117a65, #20c997)";

function SidenavBridgeCard() {
  const [controller] = useSoftUIController();
  const { miniSidenav } = controller;
  const { data: latestBridge, isLoading } = useLatestBridge();
  const hasUrl = latestBridge?.downloadUrl && latestBridge.downloadUrl.startsWith("http");

  const cardContent = (
    <>
      <SoftBox display="flex" alignItems="center" gap={1} mb={miniSidenav ? 0 : 0.5}>
        <Icon sx={{ fontSize: miniSidenav ? 20 : 18 }}>extension</Icon>
        {!miniSidenav && (
          <SoftTypography variant="caption" fontWeight="bold">
            WPHubPro Bridge
          </SoftTypography>
        )}
      </SoftBox>
      {!miniSidenav && (
        isLoading ? (
          <SoftTypography variant="caption" display="block" opacity={0.9}>…</SoftTypography>
        ) : latestBridge ? (
          <SoftTypography variant="caption" display="block" opacity={0.9}>
            v{latestBridge.version} · {hasUrl ? "Download" : "Loading…"}
          </SoftTypography>
        ) : (
          <SoftTypography variant="caption" display="block" opacity={0.9}>Download plugin</SoftTypography>
        )
      )}
    </>
  );

  const linkProps = hasUrl
    ? {
        component: "a",
        href: latestBridge.downloadUrl,
        target: "_blank",
        rel: "noopener noreferrer",
        download: latestBridge?.fileName || undefined,
      }
    : { component: "div" };

  if (miniSidenav) {
    return (
      <SoftBox pt={1} px={1} pb={0} sx={{ flexShrink: 0 }}>
        <SoftBox
          {...linkProps}
          title={latestBridge ? `Download WPHubPro Bridge v${latestBridge.version}` : "Bridge plugin"}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: cardGradient,
            borderRadius: 2,
            p: 1.5,
            color: "white",
            textDecoration: "none",
            "&:hover": { opacity: hasUrl ? 0.95 : 1 },
          }}
        >
          {cardContent}
        </SoftBox>
      </SoftBox>
    );
  }

  return (
    <SoftBox pt={2} px={2} pb={0} sx={{ flexShrink: 0 }}>
      <SoftBox
        {...linkProps}
        sx={{
          display: "block",
          background: cardGradient,
          borderRadius: 2,
          p: 1.5,
          color: "white",
          textDecoration: "none",
          "& .MuiTypography-root": { color: "white !important" },
          "&:hover": { opacity: hasUrl ? 0.95 : 1 },
        }}
      >
        {cardContent}
      </SoftBox>
    </SoftBox>
  );
}

export default SidenavBridgeCard;
