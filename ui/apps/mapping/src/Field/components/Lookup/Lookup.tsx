import { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import { Box, Checkbox, FormControl, MenuItem, Select, TextField } from "@portal/components";
import { LookupConfig, LookupListItem } from "../../../contexts";
import { SelectChangeEvent } from "@mui/material";
import { api } from "../../../axios/api";

interface LookupProps {
  data: LookupConfig;
  onChange: (data: Partial<LookupConfig>) => void;
}

export const Lookup: FC<LookupProps> = ({ data, onChange }) => {
  const [lookups, setLookups] = useState<LookupListItem[]>([]);

  const fetchLookups = useCallback(async () => {
    try {
      const response = await api.backend.getLookups("source_to_standard");
      setLookups(response);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  const handleLookupChange = useCallback(
    async (lookupName: string) => {
      const lookupSql = await api.backend.getLookupSQL(lookupName, "source_to_standard");

      if (!!lookupSql) {
        onChange({ lookupName, lookupSql, isLookupEnabled: true });
      } else {
        onChange({ lookupName, lookupSql });
      }
    },
    [onChange]
  );

  return (
    <Box py={4}>
      <Checkbox
        label="Enabled"
        checked={data.isLookupEnabled}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ isLookupEnabled: e.target.checked })}
      />
      <Box mb={2}>
        <Box fontSize={14} mb={1}>
          Lookup
        </Box>
        <FormControl fullWidth>
          <Select
            variant="outlined"
            value={data.lookupName}
            onChange={(e: SelectChangeEvent) => handleLookupChange(e.target.value)}
          >
            <MenuItem value="">&nbsp;</MenuItem>
            {lookups.map((l) => (
              <MenuItem key={l.name} value={l.name}>
                {l.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box mb={2}>
        <Box fontSize={14} mb={1}>
          SQL Preview
        </Box>
        <FormControl fullWidth>
          <TextField
            fullWidth
            multiline
            rows={5}
            size="small"
            value={data.lookupSql}
            onChange={(event) => onChange({ lookupSql: event.target.value })}
          />
        </FormControl>
      </Box>
    </Box>
  );
};
