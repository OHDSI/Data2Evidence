import { useCallback, useState } from "react";

export interface BaseFormData {
  [key: string]: any;
}

export const useFormData = <TFormData extends BaseFormData>(
  initState: TFormData
) => {
  const [formData, setFormData] = useState<TFormData>(initState);

  const onFormDataChange = useCallback((updates: { [field: string]: any }) => {
    setFormData((formData) => ({ ...formData, ...updates }));
  }, []);

  return { formData, setFormData, onFormDataChange };
};
