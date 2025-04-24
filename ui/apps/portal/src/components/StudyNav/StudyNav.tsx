import React, { FC, useCallback, useEffect, useMemo } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import { ChevronUpIcon } from "@portal/components";
import { Study, Tenant } from "../../types";
import "./StudyNav.scss";
import { useTranslation } from "../../contexts";

interface StudyNavProps {
  studies?: Study[];
  selectedStudyId: string;
  onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, studyId: string, tenantId: string) => void;
}

export const StudyNav: FC<StudyNavProps> = ({ studies, selectedStudyId, onClick }) => {
  const { getText, i18nKeys } = useTranslation();
  const [expanded, setExpanded] = React.useState("");

  useEffect(() => {
    const study = studies?.find((study) => study.id === selectedStudyId);
    setExpanded(study?.tenant.id || "");
  }, [studies, selectedStudyId]);

  const tenants = useMemo(
    () =>
      studies?.reduce((tenants: Tenant[], study: Study) => {
        if (study.tenant) {
          const exists = tenants.some((tenant) => tenant.id === study.tenant.id);
          if (!exists) tenants.push(study.tenant);
        }
        return tenants;
      }, []),
    [studies]
  );

  const handleExpand = useCallback((isExpand: boolean, tenantId: string) => {
    setExpanded(isExpand ? tenantId : "");
  }, []);

  if (!studies) return <div>{getText(i18nKeys.STUDY_NAV__NO_STUDY)}</div>;

  return (
    <div className="study-nav" data-testid="study-nav">
      {tenants?.map((tenant) => (
        <Accordion
          key={tenant.id}
          elevation={0}
          expanded={expanded === tenant.id}
          onChange={(event, isExpand) => handleExpand(isExpand, tenant.id)}
        >
          <AccordionSummary expandIcon={<ChevronUpIcon />}>{tenant.name}</AccordionSummary>
          <AccordionDetails>
            <List className="study-nav" data-testid="study-nav-tenant">
              {studies
                .filter((study) => study.tenant.id === tenant.id)
                .map((study) => (
                  <ListItem
                    button
                    disableRipple
                    key={study.id}
                    selected={selectedStudyId === study.id}
                    onClick={(event) => onClick(event, study.id, study.tenant.id)}
                    data-testid="study-nav-study"
                  >
                    <ListItemText primary={study.studyDetail?.name || getText(i18nKeys.STUDY_NAV__UNTITLED)} />
                  </ListItem>
                ))}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  );
};
