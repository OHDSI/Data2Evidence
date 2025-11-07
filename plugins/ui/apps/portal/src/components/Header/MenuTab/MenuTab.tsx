import React, { FC, useCallback, Fragment } from "react";
import { NavLink } from "../../../types";
import { Link, useLocation } from "react-router-dom";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { ChevronDownIcon, CheckmarkIcon } from "@portal/components";
import { useMenuAnchor } from "../../../hooks";
import "../Header.scss";

interface MenuTabProps {
  link: NavLink;
  className: string;
}

const MenuTab: FC<MenuTabProps> = ({ link, className }) => {
  const location = useLocation();
  const [anchorEl, openMenu, closeMenu] = useMenuAnchor();

  const getClassName = useCallback(
    (link: NavLink) => {
      if (link.path === location.pathname) {
        return "portal__menu-item portal__menu-item__is-active";
      }
      return "portal__menu-item";
    },
    [location.pathname]
  );

  return (
    <li className={className} onMouseEnter={openMenu} onMouseLeave={closeMenu} data-testid="menu-tab">
      <p data-testid="menu-tab-title" data-text={link.title}>
        {link.title}
      </p>
      <ChevronDownIcon />
      <Menu
        className="portal__menu"
        elevation={5}
        // getContentAnchorEl={null}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        keepMounted
        onClose={closeMenu}
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        hideBackdrop={true}
        style={{ pointerEvents: "none" }}
      >
        <div className="portal__menu-content" onMouseLeave={closeMenu}>
          {link.submenu?.map((link: NavLink) => (
            <Fragment key={link.id}>
              {link.path.indexOf("http://") === 0 || link.path.indexOf("https://") === 0 ? (
                <MenuItem
                  onClick={closeMenu}
                  component={"a"}
                  href={link.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="menu-tab-anchor"
                >
                  <div className={getClassName(link)}>
                    <span data-text={link.title}>{link.title}</span>
                  </div>
                </MenuItem>
              ) : (
                <MenuItem onClick={closeMenu} component={Link} to={link.path} data-testid="menu-tab-link">
                  <div className={getClassName(link)}>
                    {link.path === location?.pathname && <CheckmarkIcon />}
                    <span data-text={link.title}>{link.title}</span>
                  </div>
                </MenuItem>
              )}
            </Fragment>
          ))}
        </div>
      </Menu>
    </li>
  );
};

export default MenuTab;
