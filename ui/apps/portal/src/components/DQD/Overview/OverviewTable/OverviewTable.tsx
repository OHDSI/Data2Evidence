import React, { FC, useCallback } from "react";
import { TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Paper } from "@mui/material";
import { OverviewResults } from "../../types";
import "./OverviewTable.scss";
import { useTranslation } from "../../../../contexts";

interface OverviewTableProps {
  data: OverviewResults;
}

const OverviewTable: FC<OverviewTableProps> = ({ data }) => {
  const { getText, i18nKeys } = useTranslation();

  const transformData = useCallback(
    (data: OverviewResults) => {
      const rtnArray = [
        {
          category: getText(i18nKeys.OVERVIEW_TABLE__CATEGORY_PLAUSIBILITY),
          passVerification: data.verification.plausibility.pass,
          failVerification: data.verification.plausibility.fail,
          totalVerification: data.verification.plausibility.total,
          percentVerification: data.verification.plausibility.percentPass,
          passValidation: data.validation.plausibility.pass,
          failValidation: data.validation.plausibility.fail,
          totalValidation: data.validation.plausibility.total,
          percentValidation: data.validation.plausibility.percentPass,
          passTotal: data.total.plausibility.pass,
          failTotal: data.total.plausibility.fail,
          totalTotal: data.total.plausibility.total,
          percentTotal: data.total.plausibility.percentPass,
        },
        {
          category: getText(i18nKeys.OVERVIEW_TABLE__CATEGORY_CONFORMANCE),
          passVerification: data.verification.conformance.pass,
          failVerification: data.verification.conformance.fail,
          totalVerification: data.verification.conformance.total,
          percentVerification: data.verification.conformance.percentPass,
          passValidation: data.validation.conformance.pass,
          failValidation: data.validation.conformance.fail,
          totalValidation: data.validation.conformance.total,
          percentValidation: data.validation.conformance.percentPass,
          passTotal: data.total.conformance.pass,
          failTotal: data.total.conformance.fail,
          totalTotal: data.total.conformance.total,
          percentTotal: data.total.conformance.percentPass,
        },
        {
          category: getText(i18nKeys.OVERVIEW_TABLE__CATEGORY_COMPLETENESS),
          passVerification: data.verification.completeness.pass,
          failVerification: data.verification.completeness.fail,
          totalVerification: data.verification.completeness.total,
          percentVerification: data.verification.completeness.percentPass,
          passValidation: data.validation.completeness.pass,
          failValidation: data.validation.completeness.fail,
          totalValidation: data.validation.completeness.total,
          percentValidation: data.validation.completeness.percentPass,
          passTotal: data.total.completeness.pass,
          failTotal: data.total.completeness.fail,
          totalTotal: data.total.completeness.total,
          percentTotal: data.total.completeness.percentPass,
        },
        {
          category: getText(i18nKeys.OVERVIEW_TABLE__CATEGORY_TOTAL),
          passVerification: data.verification.total.pass,
          failVerification: data.verification.total.fail,
          totalVerification: data.verification.total.total,
          percentVerification: data.verification.total.percentPass,
          passValidation: data.validation.total.pass,
          failValidation: data.validation.total.fail,
          totalValidation: data.validation.total.total,
          percentValidation: data.validation.total.percentPass,
          passTotal: data.total.total.pass,
          failTotal: data.total.total.fail,
          totalTotal: data.total.total.total,
          percentTotal: data.total.total.percentPass,
        },
      ];
      return rtnArray;
    },
    [getText]
  );

  const rows = transformData(data);
  return (
    <TableContainer>
      <Table sx={{ minWidth: 700 }} aria-label="spanning table">
        <TableHead>
          <TableRow>
            <TableCell
              colSpan={1}
              sx={{
                borderBottomWidth: 0,
                borderLeftWidth: "1px",
                borderTopWidth: "1px",
                borderStyle: "solid",
                borderColor: "#dadbde",
              }}
            ></TableCell>
            <TableCell className="tablePrimaryHeader" align="center" colSpan={4}>
              {getText(i18nKeys.OVERVIEW_TABLE__VERIFICATION)}
            </TableCell>
            <TableCell className="tablePrimaryHeader" align="center" colSpan={4}>
              {getText(i18nKeys.OVERVIEW_TABLE__VALIDATION)}
            </TableCell>
            <TableCell className="tablePrimaryHeader" align="center" colSpan={4}>
              {getText(i18nKeys.OVERVIEW_TABLE__TOTAL)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              align="center"
              sx={{
                borderBottomWidth: "1px",
                borderLeftWidth: "1px",
                borderTopWidth: 0,
                borderStyle: "solid",
                borderColor: "#dadbde",
              }}
            ></TableCell>
            <TableCell className="tableSecondaryHeader" align="center">
              {getText(i18nKeys.OVERVIEW_TABLE__PASS)}
            </TableCell>
            <TableCell className="tableSecondaryHeader" align="center">
              {getText(i18nKeys.OVERVIEW_TABLE__FAIL)}
            </TableCell>
            <TableCell className="tableSecondaryHeader" align="center">
              {getText(i18nKeys.OVERVIEW_TABLE__TOTAL)}
            </TableCell>
            <TableCell className="tableSecondaryHeader" align="center">
              {getText(i18nKeys.OVERVIEW_TABLE__PCT_PASS)}
            </TableCell>

            <TableCell className="tableSecondaryHeader" align="center">
              {getText(i18nKeys.OVERVIEW_TABLE__PASS)}
            </TableCell>
            <TableCell className="tableSecondaryHeader" align="center">
              {getText(i18nKeys.OVERVIEW_TABLE__FAIL)}
            </TableCell>
            <TableCell className="tableSecondaryHeader" align="center">
              {getText(i18nKeys.OVERVIEW_TABLE__TOTAL)}
            </TableCell>
            <TableCell className="tableSecondaryHeader" align="center">
              {getText(i18nKeys.OVERVIEW_TABLE__PCT_PASS)}
            </TableCell>

            <TableCell className="tableSecondaryHeader" align="center">
              {getText(i18nKeys.OVERVIEW_TABLE__PASS)}
            </TableCell>
            <TableCell className="tableSecondaryHeader" align="center">
              {getText(i18nKeys.OVERVIEW_TABLE__FAIL)}
            </TableCell>
            <TableCell className="tableSecondaryHeader" align="center">
              {getText(i18nKeys.OVERVIEW_TABLE__TOTAL)}
            </TableCell>
            <TableCell className="tableSecondaryHeader" align="center">
              {getText(i18nKeys.OVERVIEW_TABLE__PCT_PASS)}
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.category}>
              <TableCell className="tableCell" sx={{ color: "#050080", fontWeight: "500" }} align="right">
                {row.category}
              </TableCell>
              <TableCell className="tableCell" sx={{ color: "#050080" }} align="center">
                {row.passVerification}
              </TableCell>
              <TableCell className="tableCellFail" align="center">
                {row.failVerification}
              </TableCell>
              <TableCell className="tableCell" align="center">
                {row.totalVerification}
              </TableCell>
              <TableCell className="tableCell" align="center">
                {row.percentVerification === "-" ? "N/A" : row.percentVerification}
              </TableCell>

              <TableCell className="tableCell" align="center">
                {row.passValidation}
              </TableCell>
              <TableCell className="tableCellFail" align="center">
                {row.failValidation}
              </TableCell>
              <TableCell className="tableCell" align="center">
                {row.totalValidation}
              </TableCell>
              <TableCell className="tableCell" align="center">
                {row.percentValidation === "-" ? "N/A" : row.percentValidation}
              </TableCell>

              <TableCell className="tableCell" align="center">
                {row.passTotal}
              </TableCell>
              <TableCell className="tableCellFail" align="center">
                {row.failTotal}
              </TableCell>
              <TableCell className="tableCell" align="center">
                {row.totalTotal}
              </TableCell>
              <TableCell className="tableCell" align="center">
                {row.percentTotal === "-" ? "N/A" : row.percentTotal}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="overview-text-container">
        <div>
          {getText(i18nKeys.OVERVIEW_TABLE__NOTE_1, [String(data.total.total.allNa), String(data.total.total.pass)])}
        </div>
        <div>
          {getText(i18nKeys.OVERVIEW_TABLE__NOTE_2, [String(data.total.total.allError), String(data.total.total.fail)])}
        </div>
        <div>
          {getText(i18nKeys.OVERVIEW_TABLE__NOTE_3, [
            data.total.total.correctedPassPercentage,
            String(data.total.total.PassMinusAllNA),
            String(data.total.total.totalMinusAllErrorMinusAllNA),
          ])}
        </div>
      </div>
    </TableContainer>
  );
};

export default OverviewTable;
