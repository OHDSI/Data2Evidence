import React, { FC, useCallback, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { ChevronDownIcon } from "@portal/components";
import { Roles, config } from "../../../config";
import { Plugins } from "../../../types";
import { useEnabledFeatures, useMenuAnchor } from "../../../hooks";
import { getPluginChildPath } from "../../../utils";
import { useActiveDataset, useTranslation, useUser } from "../../../contexts";
import "../Header.scss";

export enum MenuType {
  Dataset,
  Plugin,
}

interface MenuNavProps {
  type: MenuType;
  plugin?: Plugins;
  isSysAdmin?: boolean;
}

const toCamelCase = (string: string) => {
  return string.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase());
};

const MenuNav: FC<MenuNavProps> = ({ type, plugin, isSysAdmin }) => {
  const { getText, i18nKeys } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, openMenu, closeMenu] = useMenuAnchor();

  const { activeDataset } = useActiveDataset();

  const { user } = useUser();
  const featureFlags = useEnabledFeatures();
  const requiredRoles = useMemo(() => plugin?.requiredRoles || [], [plugin?.requiredRoles]);
  const featureFlag = useMemo(() => plugin?.featureFlag || "", [plugin?.featureFlag]);

  const isResearcherPluginAllowed = useCallback(() => {
    let allowed = (requiredRoles.length || 0) === 0;
    if (type === MenuType.Dataset || isSysAdmin) return allowed;
    if (!allowed && requiredRoles) {
      for (const role of requiredRoles) {
        if (role === Roles.STUDY_RESEARCHER) {
          allowed = allowed || user.isDatasetResearcher[activeDataset.id];
        }
      }
    }

    if (allowed && plugin?.children) {
      plugin.children.map((childPlugin: Plugins) => {
        allowed = featureFlags.includes(childPlugin.featureFlag || "");
      });
    } else if (allowed) {
      allowed = featureFlags.includes(featureFlag);
    }
    return allowed;
  }, [activeDataset.id, featureFlag, featureFlags, isSysAdmin, plugin?.children, requiredRoles, type, user]);

  const portalTypePath = useMemo(() => {
    if (isSysAdmin) {
      return config.ROUTES.systemadmin;
    } else {
      return config.ROUTES.researcher;
    }
  }, [isSysAdmin]);

  const menuLink = useMemo(() => {
    if (type === MenuType.Plugin && plugin) {
      return `${portalTypePath}/${plugin.route}`;
    } else {
      return `${portalTypePath}/information`;
    }
  }, [plugin, portalTypePath, type]);

  const handlePluginClick = useCallback(
    (plugin: Plugins, stateStr?: string) => {
      let eventName = "";
      if (stateStr) {
        eventName = toCamelCase(stateStr);
      }
      const dispatchPluginEvent = () => {
        const pluginEvent = new CustomEvent("menuClicked", {
          detail: {
            event: eventName,
          },
        });
        window.dispatchEvent(pluginEvent);
      };

      setTimeout(dispatchPluginEvent, 1000);
      navigate(getPluginChildPath(plugin), {
        replace: true,
      });
    },
    [navigate]
  );

  const isActiveTab = useCallback((): boolean => {
    const currLocation = location.pathname;
    if (plugin && plugin.children) {
      const type = plugin.name.replace(/\s+/g, "-").toLowerCase();
      return currLocation.includes(type);
    } else {
      return currLocation.startsWith(menuLink);
    }
  }, [location.pathname, menuLink, plugin]);

  const isActivePlugin = useCallback(
    (plugin: Plugins) => {
      return location.pathname === `${portalTypePath}/${getPluginChildPath(plugin)}`;
    },
    [location.pathname, portalTypePath]
  );

  const renderPluginMenu = useCallback(
    (plugin: Plugins) => {
      if (plugin.children || plugin.menus) {
        return (
          <>
            {plugin && plugin.children ? (
              <a data-text={plugin.name} className="plugin-type-title">
                {plugin.name}
              </a>
            ) : plugin && plugin.menus ? (
              <Link to={menuLink} data-text={plugin.name} className="overview-title">
                {plugin.name}
              </Link>
            ) : null}

            <ChevronDownIcon className="portal__menu__chevron-down" />
            <Menu
              className="portal__menu"
              elevation={5}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={closeMenu}
              hideBackdrop={true}
              style={{ pointerEvents: "none" }}
              PaperProps={{
                style: {
                  maxHeight: "calc(100% - 85px)",
                },
              }}
            >
              <div className="portal__menu-content" onMouseLeave={closeMenu}>
                {plugin && plugin.children ? (
                  <>
                    {plugin.children.map((p) => (
                      <MenuItem key={p.name} onClick={() => handlePluginClick(p)}>
                        <div
                          className={
                            isActivePlugin(p) ? "portal__menu-item portal__menu-item__is-active" : "portal__menu-item"
                          }
                        >
                          <span data-text={p.name}>{p.name}</span>
                        </div>
                      </MenuItem>
                    ))}
                  </>
                ) : plugin && plugin.menus ? (
                  <>
                    {plugin.menus.map((p) => (
                      <MenuItem key={p} onClick={() => handlePluginClick(plugin, p)}>
                        <div className="portal__menu-item">
                          <span data-text={p}>{p}</span>
                        </div>
                      </MenuItem>
                    ))}
                  </>
                ) : null}
              </div>
            </Menu>
          </>
        );
      }

      return (
        <Link to={menuLink} data-text={plugin.name} className="overview-title">
          {plugin.name}
        </Link>
      );
    },
    [anchorEl, closeMenu, handlePluginClick, isActivePlugin]
  );

  if (type === MenuType.Plugin && !isResearcherPluginAllowed()) {
    if (isActiveTab()) {
      navigate(`${portalTypePath}/information`);
    }
    return null;
  }

  return (
    <li
      onMouseEnter={openMenu}
      onMouseLeave={closeMenu}
      className={isActiveTab() ? "header__menu-overview header__menu-item--active" : "header__menu-overview"}
    >
      {type === MenuType.Dataset && (
        <Link to={`${config.ROUTES.researcher}/information`} data-text="Dataset" className="overview-title">
          {getText(i18nKeys.MENU_NAV__DATASET)}
        </Link>
      )}
      {type === MenuType.Plugin && plugin && renderPluginMenu(plugin)}
    </li>
  );
};

export default MenuNav;
