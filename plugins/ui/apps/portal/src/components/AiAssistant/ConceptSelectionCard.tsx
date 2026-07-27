import React, { FC } from "react";
import classNames from "classnames";
import CloseIcon from "@mui/icons-material/Close";
import UndoIcon from "@mui/icons-material/Undo";
import { useTranslation } from "../../contexts";
import { ConceptSelection, ConceptSuggestion } from "./types";

interface ConceptSelectionCardProps {
  selection: ConceptSelection;
  // Flips one concept in or out of the set. Omitted once the card is resolved.
  onToggleConcept?: (conceptId: number) => void;
}

// Second line of a row: the vocabulary the concept comes from and its code, e.g.
// "SNOMED 44054006". search_concepts does not always carry a source code, so fall
// back to the OMOP concept id — which is the id the concept set is actually built
// from, and the one worth showing if only one can be.
const conceptCodeLine = (concept: ConceptSuggestion): string =>
  [concept.vocabularyId, concept.conceptCode ?? concept.conceptId].filter(Boolean).join(" ");

/**
 * The concepts the assistant proposes for a concept set, as a list the user picks
 * from before it is created (Figma node 1478:110682).
 *
 * This is a gate, not a preview: the agent's turn is parked on the
 * `ui_confirm_concepts` tool call that produced this card, and only the concepts
 * still ticked here are sent back as its output. A near-miss concept quietly
 * changes what the cohort means, so the list is the user's to correct before
 * anything is written.
 *
 * Unticking marks a row struck through rather than deleting it: the design's only
 * per-row control is a remove button, and a list you cannot put a row back into
 * makes one stray click cost a whole round trip through the model.
 */
export const ConceptSelectionCard: FC<ConceptSelectionCardProps> = ({ selection, onToggleConcept }) => {
  const { getText, i18nKeys } = useTranslation();
  const selected = new Set(selection.selectedIds);
  const interactive = !selection.resolved && Boolean(onToggleConcept);

  return (
    <div
      className={classNames("ai-assistant__concepts", { "ai-assistant__concepts--resolved": selection.resolved })}
      data-testid="ai-concept-selection"
    >
      {/* The model may skip the lead-in; without one the card lands as a bare list of
          codes with no statement of what approving it would do. */}
      <p className="ai-assistant__bubble-text">{selection.intro || getText(i18nKeys.AI_ASSISTANT__CONCEPTS_INTRO)}</p>

      <div className="ai-assistant__concept-card">
        <p className="ai-assistant__concept-card-title">{selection.name}</p>

        <ul className="ai-assistant__concept-list">
          {selection.concepts.map((concept) => {
            const isSelected = selected.has(concept.conceptId);
            return (
              <li
                key={concept.conceptId}
                className={classNames("ai-assistant__concept", {
                  "ai-assistant__concept--excluded": !isSelected,
                })}
                data-testid={`ai-concept-${concept.conceptId}`}
              >
                <div className="ai-assistant__concept-text">
                  <span className="ai-assistant__concept-name">{concept.conceptName}</span>
                  <span className="ai-assistant__concept-code">{conceptCodeLine(concept)}</span>
                </div>

                {interactive && (
                  <button
                    type="button"
                    className={classNames("ai-assistant__concept-toggle", {
                      "ai-assistant__concept-toggle--restore": !isSelected,
                    })}
                    onClick={() => onToggleConcept?.(concept.conceptId)}
                    aria-pressed={!isSelected}
                    aria-label={getText(
                      isSelected ? i18nKeys.AI_ASSISTANT__CONCEPT_REMOVE : i18nKeys.AI_ASSISTANT__CONCEPT_RESTORE,
                      [concept.conceptName]
                    )}
                    title={getText(
                      isSelected ? i18nKeys.AI_ASSISTANT__CONCEPT_REMOVE : i18nKeys.AI_ASSISTANT__CONCEPT_RESTORE,
                      [concept.conceptName]
                    )}
                    data-testid={`ai-concept-toggle-${concept.conceptId}`}
                  >
                    {/* 16px inside the 24px button: the design's glyph is ~9.3px of the
                        24px box, which is what a 16px MUI icon draws. */}
                    {isSelected ? <CloseIcon sx={{ fontSize: 16 }} /> : <UndoIcon sx={{ fontSize: 16 }} />}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {/* Once answered the card stops being a prompt, so say what was actually sent —
            otherwise a transcript of struck-through rows reads as still-undecided. */}
        <p className="ai-assistant__concept-count" data-testid="ai-concept-count">
          {getText(
            selection.resolved
              ? i18nKeys.AI_ASSISTANT__CONCEPTS_INCLUDED
              : i18nKeys.AI_ASSISTANT__CONCEPTS_SELECTED_COUNT,
            [String(selection.selectedIds.length), String(selection.concepts.length)]
          )}
        </p>
      </div>
    </div>
  );
};
