import React, { FC, useMemo } from "react";

interface HighlightTextProps {
  text: string;
  searchText?: string;
}

const escapeRegExp = (text: string) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const HighlightText: FC<HighlightTextProps> = ({ text, searchText }) => {
  const { parts, regex } = useMemo(() => {
    if (!searchText || !searchText.trim()) {
      return { parts: [text], regex: null };
    }

    const searchWords = searchText.split(/\s+/).filter((word) => word.length > 0);
    const regexPattern = searchWords.map(escapeRegExp).join("|");
    const regex = new RegExp(`(${regexPattern})`, "gi");
    const parts = text.split(regex);

    return { parts, regex };
  }, [text, searchText]);

  return (
    <>
      {parts.map((part, index) =>
        regex && regex.test(part) ? (
          <span key={index} style={{ background: "#DCDEF4" }}>
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};
