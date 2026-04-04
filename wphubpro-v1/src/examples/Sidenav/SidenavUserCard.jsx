/**
 * User details card for Sidenav - blue gradient, avatar, name, email, role, action buttons
 */
import { Link } from "react-router-dom";

import SoftBox from "components/SoftBox";
import { useToast } from "../../contexts/ToastContext";
import SoftTypography from "components/SoftTypography";
import SoftAvatar from "components/SoftAvatar";
import Icon from "@mui/material/Icon";
import { useSoftUIController } from "context";
import { useAuth } from "../../domains/auth";
import { avatars } from "../../services/appwrite";
import colors from "assets/theme/base/colors";

const infoGradient = "linear-gradient(310deg, #4F5482, #7a8ef0)";
const orangeMain = colors.gradients.success.main;

function getAvatarUrl(user) {
  if (!user?.$id) return undefined;
  try {
    const name = (user.name || user.email || "U").substring(0, 2).toUpperCase();
    return avatars.getInitials(name, 80, 80).toString();
  } catch {
    return undefined;
  }
}

function ActionButton({ icon, title, to, onClick }) {
  const btn = (
    <SoftBox
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        p: 0.5,
        borderRadius: "50%",
        background: "white",
        color: `${orangeMain} !important`,
        cursor: "pointer",
        "&:hover": { opacity: 0.9 },
      }}
      title={title}
    >
      <Icon sx={{ fontSize: 12 }}>{icon}</Icon>
    </SoftBox>
  );

  if (to) {
    return (
      <Link to={to} style={{ textDecoration: "none" }}>
        {btn}
      </Link>
    );
  }
  return (
    <SoftBox component="button" onClick={onClick} sx={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
      {btn}
    </SoftBox>
  );
}

function SidenavUserCard() {
  const [controller] = useSoftUIController();
  const { miniSidenav } = controller;
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  if (!user) {
    return (
      <SoftBox pt={2} px={2} pb={2}>
        <SoftBox
          component={Link}
          to="/login"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            py: 1.5,
            px: 2,
            background: infoGradient,
            borderRadius: 2,
            color: "white !important",
            textDecoration: "none",
            fontWeight: 600,
            "& .MuiTypography-root": { color: "white !important" },
          }}
        >
          Inloggen
        </SoftBox>
      </SoftBox>
    );
  }

  const avatarUrl = getAvatarUrl(user);

  // In collapsed/mini mode: only show the 3 action buttons vertically
  if (miniSidenav) {
    return (
      <SoftBox pt={2} my={1} mx={1} sx={{ flexShrink: 0, display: "flex", justifyContent: "center" }}>
        <SoftBox
          sx={{
            background: infoGradient,
            borderRadius: 2,
            p: 1.5,
            color: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.5,
            "& .MuiTypography-root": { color: "white !important" },
          }}
        >
          <ActionButton icon="person" title="Profile" to="/account" />
          <ActionButton
            icon="settings"
            title="Settings"
            onClick={() => toast({ title: "Account Settings", description: "Coming soon", variant: "default" })}
          />
        </SoftBox>
      </SoftBox>
    );
  }

  return (
    <SoftBox pt={2} my={1} mx={2} sx={{ flexShrink: 0, mr: 1.5 }}>
        <SoftBox
        sx={{
          background: infoGradient,
          borderRadius: 2,
          p: 2,
          pr: 3,
          color: "white",
          "& .MuiTypography-root": { color: "white !important" },
        }}
      >
        <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <SoftTypography
            variant="caption"
            color="white"
            sx={{
              display: "inline-block",
              px: 1,
              py: 0.25,
              borderRadius: 1,
              bgcolor: orangeMain,
              color: "white !important",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            {isAdmin ? "Admin" : "Platform Member"}
          </SoftTypography>
          <SoftBox display="flex" gap={0.5}>
            <ActionButton icon="person" title="My profile" to="/account" />
            <ActionButton
              icon="settings"
              title="Account settings"
              onClick={() => toast({ title: "Account Settings", description: "Coming soon", variant: "default" })}
            />
          </SoftBox>
        </SoftBox>
        <SoftBox display="flex" flexDirection="row" alignItems="center" gap={1.5}>
          <SoftAvatar
            src={avatarUrl}
            alt={user.name || user.email}
            size="sm"
            sx={{
              width: 48,
              height: 48,
              flexShrink: 0,
              bgcolor: "rgba(255,255,255,0.3)",
            }}
          />
          <SoftBox flex={1} minWidth={0}>
            <SoftTypography variant="button" fontWeight="bold" color="white" noWrap>
              {user.name || "User"}
            </SoftTypography>
            {user.email ? (
              <a href={`mailto:${user.email}`} style={{ textDecoration: "none", color: "inherit", opacity: 0.9, fontSize: 10, display: "block" }}>
                <SoftTypography
                  variant="caption"
                  color="white"
                  sx={{ opacity: 0.9, fontSize: 10, "&:hover": { textDecoration: "underline" } }}
                >
                  {user.email}
                </SoftTypography>
              </a>
            ) : (
              <SoftTypography variant="caption" color="white" sx={{ opacity: 0.9, fontSize: 10 }} display="block">
                {" "}
              </SoftTypography>
            )}
          </SoftBox>
        </SoftBox>
      </SoftBox>
    </SoftBox>
  );
}

export default SidenavUserCard;
