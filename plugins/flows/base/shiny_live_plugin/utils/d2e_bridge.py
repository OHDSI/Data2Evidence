"""Helpers for the D2E host page: postMessage bridge, auth token, wizard context and input clean-up."""
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

# Receives the auth token and context from the host page via postMessage.
POSTMESSAGE_JS = """
        window.d2e_token = null;
        window.d2e_context = {};

        function pushContextToShiny() {
            if (typeof Shiny === 'undefined' || typeof Shiny.setInputValue !== 'function') {
                return false;
            }

            try {
                Shiny.setInputValue('d2e_token', window.d2e_token, {priority: 'event'});
                Shiny.setInputValue('d2e_context', window.d2e_context, {priority: 'event'});
                Shiny.setInputValue('d2e_datasetId', window.d2e_context.datasetId, {priority: 'event'});
                Shiny.setInputValue('d2e_cohortId', window.d2e_context.cohortId, {priority: 'event'});
                Shiny.setInputValue('d2e_wizardConfig', window.d2e_context.wizardConfig, {priority: 'event'});
                Shiny.setInputValue('d2e_mriquery', window.d2e_context.mriquery, {priority: 'event'});
                Shiny.setInputValue('d2e_dialect', window.d2e_context.dialect, {priority: 'event'});
                Shiny.setInputValue('auth_ready', Date.now(), {priority: 'event'});
                return true;
            } catch (err) {
                console.warn('[D2E] Shiny input bridge not ready yet:', err);
                return false;
            }
        }

        function retryPushContextToShiny() {
            if (pushContextToShiny()) {
                return;
            }

            let attempts = 0;
            const interval = window.setInterval(function() {
                attempts += 1;
                if (pushContextToShiny() || attempts >= 20) {
                    window.clearInterval(interval);
                }
            }, 250);
        }

        // Handle messages from the host page.
        window.addEventListener('message', function(event) {
            console.log('[D2E] Received postMessage from:', event.origin, 'type:', event.data?.type);
            const data = event.data;

            if (!data || !data.type) {
                return;
            }

            if (data.type === 'AUTH_TOKEN') {
                console.log('[D2E] Processing AUTH_TOKEN message');

                window.d2e_token = data.token;
                globalThis.d2e_token = data.token;

                window.d2e_context = {
                    datasetId: data.context?.datasetId || null,
                    cohortId: data.context?.cohortId || null,
                    wizardConfig: data.context?.wizardConfig || null,
                    mriquery: data.context?.mriquery || null,
                    dialect: data.context?.dialect || null
                };
                globalThis.d2e_context = window.d2e_context;

                retryPushContextToShiny();

                const targetWindow = window.top;
                if (targetWindow && targetWindow !== window) {
                    targetWindow.postMessage({type: 'AUTH_READY'}, '*');
                }
            }
        });

        function sendReadySignal() {
            const targetWindow = window.top;
            if (targetWindow && targetWindow !== window) {
                try {
                    targetWindow.postMessage({type: 'SHINYLIVE_READY'}, '*');
                    console.log('[D2E] ✓ SHINYLIVE_READY sent to window.top');
                } catch (err) {
                    console.error('[D2E] ✗ Failed to send SHINYLIVE_READY:', err);
                }
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', sendReadySignal);
        } else {
            sendReadySignal();
        }

        setTimeout(sendReadySignal, 500);
        setTimeout(sendReadySignal, 1500);
    """


def get_token(input) -> Optional[str]:
    """Bearer token from the Shiny input, else from the JS globals."""
    try:
        token = input.d2e_token()
        if token and str(token).lower() not in ('null', 'undefined'):
            return str(token)
    except Exception as e:
        print(f"[get_token] Could not get token from input.d2e_token: {e}")

    try:
        import js
        token = js.globalThis.d2e_token if hasattr(js, 'globalThis') and hasattr(js.globalThis, 'd2e_token') else None
        if token and str(token).lower() not in ('null', 'undefined'):
            return str(token)
    except Exception as e:
        print(f"[get_token] Could not get token from js.globalThis: {e}")

    try:
        from js import window
        token = window.d2e_token if hasattr(window, 'd2e_token') else None
        if token and str(token).lower() not in ('null', 'undefined'):
            return str(token)
    except Exception as e:
        print(f"[get_token] Could not get token from js.window: {e}")

    print("[get_token] No valid token found.")
    return None


def get_context(input) -> Dict[str, Any]:
    """Context from the Shiny inputs, else from the JS globals."""
    context = {
        'datasetId': None,
        'cohortId': None,
        'wizardConfig': None,
        'mriquery': None,
        'dialect': None,
    }

    try:
        if hasattr(input, 'd2e_datasetId') and input.d2e_datasetId():
            context['datasetId'] = str(input.d2e_datasetId())
        if hasattr(input, 'd2e_cohortId') and input.d2e_cohortId():
            context['cohortId'] = str(input.d2e_cohortId())
        if hasattr(input, 'd2e_wizardConfig') and input.d2e_wizardConfig():
            context['wizardConfig'] = input.d2e_wizardConfig()
        if hasattr(input, 'd2e_mriquery') and input.d2e_mriquery():
            context['mriquery'] = input.d2e_mriquery()
        if hasattr(input, 'd2e_dialect') and input.d2e_dialect():
            context['dialect'] = str(input.d2e_dialect())

        if context['datasetId']:
            return context
    except Exception as e:
        print(f"Error getting context from individual inputs: {e}")

    try:
        import js
        ctx = js.globalThis.d2e_context if js else None
        if ctx:
            context['datasetId'] = str(ctx.datasetId) if hasattr(ctx, 'datasetId') and ctx.datasetId else None
            context['cohortId'] = str(ctx.cohortId) if hasattr(ctx, 'cohortId') and ctx.cohortId else None
            context['wizardConfig'] = ctx.wizardConfig.to_py() if hasattr(ctx, 'wizardConfig') and ctx.wizardConfig else None
            context['mriquery'] = str(ctx.mriquery) if hasattr(ctx, 'mriquery') and ctx.mriquery else None
            context['dialect'] = str(ctx.dialect) if hasattr(ctx, 'dialect') and ctx.dialect else None
    except Exception as e:
        print(f"Error getting context from globalThis: {e}")

    return context


def get_year_range(ctx: Dict[str, Any]) -> Tuple[int, int]:
    """(start_year, end_year) from the wizard config."""
    wizard_config = ctx.get("wizardConfig") if ctx else None
    year_range = wizard_config.get("year", {}) if wizard_config else {}
    start_year = int(year_range.get("from", 2000))
    end_year = int(year_range.get("to", datetime.now().year))
    return start_year, end_year


def sanitize_input(value: str) -> str:
    """Strip a trailing period."""
    if value.endswith('.'):
        return value[:-1]
    return value
