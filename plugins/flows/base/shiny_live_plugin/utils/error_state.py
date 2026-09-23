"""Shared fetch-error state for the calculate-* dashboards and cross-sectional-demographics.py.

The error card reuses empty_state.py's card layout (state_card) in the same
chart slot as the no-data card. This module holds what's specific to the
error variant - the wording, the warning glyph, the retry button and their
CSS - so the dashboards don't each carry their own copy. empty_state.py
imports from here (register_empty_state's error defaults, and
ERROR_STATE_CSS inside EMPTY_STATE_CSS); this module imports nothing from
empty_state.py, so there's no import cycle.
"""
from shiny import ui

ERROR_STATE_TITLE = "Unable to load data"
ERROR_STATE_SUBTITLE = "Something went wrong while fetching results. Please try again."

# Warning-triangle glyph for the fetch-error card - register_empty_state's
# default error_icon_svg, centered in the same 140x140 slot as the empty-state
# glyph (see .empty-state-icon-error in ERROR_STATE_CSS).
ERROR_ICON_SVG = """
<svg xmlns="http://www.w3.org/2000/svg" width="87" height="70" viewBox="0 0 87 70" fill="none">
<path d="M43.4316 0C44.5818 0 45.7108 0.310737 46.6953 0.898438C47.6797 1.4852 48.4877 2.33325 49.0332 3.34668L86.4639 68.2158C85.4663 68.6491 84.4226 69.0517 83.3613 69.4102L46.2236 5.05371C45.4872 3.79695 44.4473 3.04695 43.4395 3.04688C42.4072 3.04688 41.3908 3.77911 40.6533 5.05371L3.17285 69.9756C2.1238 69.649 1.05654 69.2889 0 68.9033L37.8096 3.4082C38.3701 2.36014 39.1854 1.49677 40.168 0.907227C41.1515 0.315835 42.2797 0.00190342 43.4316 0ZM43.3359 56.5234C44.1145 56.5235 44.8505 56.8225 45.4082 57.3652C45.6953 57.6374 45.9057 57.936 46.0498 58.2793C46.1957 58.6198 46.2664 58.9822 46.2627 59.3564C46.2795 59.8131 46.2162 60.206 46.0674 60.5645C45.9205 60.918 45.6947 61.2377 45.4141 61.4922C44.8647 61.9891 44.1551 62.2627 43.4121 62.2627H43.3223C42.5745 62.2627 41.8534 61.9912 41.29 61.4971C41.013 61.2491 40.7875 60.9299 40.6387 60.5752C40.4899 60.2224 40.4208 59.834 40.4404 59.4531C40.4348 59.0002 40.5005 58.6301 40.6465 58.2773C40.7896 57.9323 40.9971 57.6263 41.2617 57.3691C41.8195 56.8245 42.5564 56.5253 43.3359 56.5234ZM43.8955 26.4824C44.222 26.4825 44.5468 26.5644 44.834 26.7188C45.183 26.9078 45.466 27.1951 45.6494 27.5488C46.108 28.67 46.3282 30.0106 46.2637 31.3086C46.2646 32.4577 46.2088 33.534 46.0938 34.6055L45.0303 46.8086C44.9853 47.925 44.7568 48.9402 44.3311 49.9219C44.2487 50.107 44.1022 50.2735 43.9189 50.3877C43.7441 50.4962 43.5437 50.5536 43.3398 50.5537L43.0918 50.5547C42.9 50.5547 42.7095 50.5005 42.541 50.3994C42.3624 50.2881 42.2209 50.1262 42.1357 49.9326C41.7521 48.9715 41.5181 47.8938 41.4629 46.8232L40.6611 34.9375C40.5152 32.6851 40.4414 31.0344 40.4414 30.0293C40.3909 29.0036 40.7005 28.0785 41.3359 27.3477C41.583 27.0885 41.9137 26.8664 42.2852 26.7139C42.6322 26.5708 42.9991 26.498 43.377 26.498L43.6602 26.4941C43.7594 26.4848 43.8272 26.4824 43.8955 26.4824Z" fill="#ACABA8"/>
</svg>"""

# Included in empty_state.EMPTY_STATE_CSS, so dashboards keep injecting just
# that one stylesheet.
ERROR_STATE_CSS = """
    /* Error glyphs are smaller than the 140x140 empty-state one - center
       them in the same slot so the title lines up across both states. */
    .empty-state-icon-error {
        display: flex;
        align-items: center;
        justify-content: center;
    }
    /* Outlined navy button. Bootstrap's .btn-primary drives every state
       (hover/focus/active/disabled) from --bs-btn-* variables, so those are
       overridden here instead of just background/color - otherwise clicking
       or tabbing to it would flash Bootstrap's own blue. */
    .empty-state-action {
        --bs-btn-color: #000080;
        --bs-btn-bg: transparent;
        --bs-btn-border-color: var(--Primary-Lightest, #CCCFE5);
        --bs-btn-hover-color: #000080;
        --bs-btn-hover-bg: rgba(0, 0, 128, 0.08);
        --bs-btn-hover-border-color: var(--Primary-Lightest, #CCCFE5);
        --bs-btn-active-color: #000080;
        --bs-btn-active-bg: rgba(0, 0, 128, 0.16);
        --bs-btn-active-border-color: var(--Primary-Lightest, #CCCFE5);
        --bs-btn-focus-shadow-rgb: 0, 0, 128;
        margin-top: 24px;
        padding: 10px 20px;
        border-radius: var(--Spacing-XS, 8px);
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 16px;
        font-style: normal;
        font-weight: 500;
        line-height: 16px;
    }
"""


def error_state_icon(svg=ERROR_ICON_SVG):
    """The error card's icon: raw <svg> markup wrapped in the same 140x140
    slot the empty-state glyph uses, so the title lines up across both."""
    return ui.div(
        ui.HTML(svg),
        class_="empty-state-icon empty-state-icon-error",
    )


def error_state_retry_button(input_id, label="Retry"):
    """The retry button shown below the error card's subtitle. The caller
    owns the handler - a separate @reactive.event(input.<input_id>) effect
    that re-runs its fetch."""
    return ui.input_action_button(
        input_id, label, class_="btn-primary empty-state-action"
    )


