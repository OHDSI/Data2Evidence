import { FC, useCallback, useMemo } from "react";
import { Box, Button, IconButton, TextField } from "@portal/components";
import ClearIcon from "@mui/icons-material/Clear";
import { Case } from "../../../../../contexts";

interface SwitchCaseTransformationFunctionProps {
  cases: Case[];
  onChange: (cases: Case[]) => void;
}

const ANY_VALUE = "Any value";

export const SwitchCaseTransformationFunction: FC<SwitchCaseTransformationFunctionProps> = ({ cases, onChange }) => {
  const hasDefault = useMemo(() => cases.some((c) => c.isDefault), [cases]);

  const reorderCases = useCallback(
    (updatedCases: Case[]) => {
      onChange(updatedCases.map((c, index) => ({ ...c, id: index + 1 })));
    },
    [onChange]
  );

  const handleAddRow = useCallback(() => {
    reorderCases([
      ...cases.filter((c) => !c.isDefault),
      { id: cases.length + 1, in: "default", out: "default", isDefault: false },
      ...cases.filter((c) => c.isDefault),
    ]);
  }, [cases, reorderCases]);

  const handleAddDefault = useCallback(() => {
    reorderCases([...cases, { id: cases.length + 1, in: ANY_VALUE, out: "default", isDefault: true }]);
  }, [cases, reorderCases]);

  return (
    <Box display="flex" flexDirection="column">
      <Box alignSelf="flex-end" position="relative" top="-47px" right="40px" height={0}>
        <Button variant="text" text="Add row" onClick={handleAddRow} />
        <Button variant="text" text="Add default" onClick={handleAddDefault} disabled={hasDefault} />
      </Box>
      <Box display="flex" gap={1} bgcolor="black" color="white">
        <Box flex={1} px={2} py={0.5}>
          In
        </Box>
        <Box flex={1} px={2} py={0.5}>
          Out
        </Box>
      </Box>
      <Box className="switch-case-transformation-function__content">
        {cases.map((c, index) => (
          <Box key={c.id} display="flex" className="switch-case-transformation-function__content-row">
            <Box flex={1} border="1px solid #999" px={2} marginTop="-1px">
              <TextField
                fullWidth
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                }}
                disabled={c.in === "Any value"}
                size="small"
                value={c.in}
                onChange={(event) =>
                  onChange([
                    ...cases.slice(0, index),
                    { ...c, in: event.target.value },
                    ...cases.slice(index + 1, cases.length),
                  ])
                }
              />
            </Box>
            <Box display="flex" flex={1} border="1px solid #999" pl={2} marginTop="-1px" marginLeft="-1px">
              <TextField
                fullWidth
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                }}
                size="small"
                value={c.out}
                onChange={(event) =>
                  onChange([
                    ...cases.slice(0, index),
                    { ...c, out: event.target.value },
                    ...cases.slice(index + 1, cases.length),
                  ])
                }
              />
              <IconButton
                startIcon={<ClearIcon />}
                onClick={() => reorderCases([...cases.slice(0, index), ...cases.slice(index + 1, cases.length)])}
              />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
