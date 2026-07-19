# custom_components/oig_cloud/ai_task.py
"""OIG's own AI Task entity (SCOPE-REVISION #9).

ai_task cannot be installed standalone, and no HACS plugin does AI Task +
custom endpoint reliably — so OIG ships the entity itself. This module is a
THIN adapter: the provider call lives in ai/backends.py, which imports nothing
from Home Assistant and is testable on any HA version.

This module imports from homeassistant.components.ai_task, which only exists on
HA >= 2025.8. It is therefore NEVER imported on an older HA: __init__.py guards
Platform.AI_TASK with hasattr() (SCOPE-REVISION #5 — AI is optional), and HA
only imports a platform module when it is forwarded. On the current dev harness
(2025.1.4) this module is simply never loaded, which is why the entity tests
are skip-guarded.
"""
from __future__ import annotations

from typing import Any, Mapping, Optional

from homeassistant.components.ai_task import (
    AITaskEntity,
    AITaskEntityFeature,
    GenDataTask,
    GenDataTaskResult,
)
from homeassistant.components.conversation import (  # type: ignore[attr-defined]
    ChatLog,  # exists on HA >= 2025.8 (this module's target); absent on the
)             # 2025.1.4 dev harness, where the module is never imported anyway
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .ai.backends import PROVIDERS, OpenAiCompatBackend
from .ai.key_store import AiKeyStore

# Head of each provider's fallback chain (F1-DESIGN §4 "ai_models": groq[0],
# nvidia[0]). The real, ORDERED chain + per-model failover is the remote_config
# loader (D6/P1/K2a), a deliberately deferred item; until it lands the entity is
# constructed with the chain HEAD as its model. PROVIDERS (ai/backends.py) carries
# only {base_url, key_prefix} and MUST NOT gain a model field here (out of scope +
# would change the OUTGOING backend contract), so the default lives in this THIN
# adapter. RESIDUAL: swap this for the remote_config chain when that lands.
DEFAULT_MODELS: dict[str, str] = {
    "groq": "llama-3.3-70b-versatile",
    "nvidia": "z-ai/glm-5.2",
}


class OigAiTaskEntity(AITaskEntity):
    """Generates structured data via the user's chosen provider.

    THREE co-equal providers (SCOPE-REVISION #8), and 'ai_task' is one of them:
    the user asked for the AI they already run in their own HA. Dispatch MUST
    branch on it — falling through to the OIG backend would send that user's
    prompts to Groq/NVIDIA, which is precisely the choice they declined.
    """

    _attr_supported_features = AITaskEntityFeature.GENERATE_DATA

    def __init__(
        self,
        provider: str,
        backend: Optional[OpenAiCompatBackend],
        install: Optional[Mapping[str, Any]],
        entry_id: str,
    ) -> None:
        """Wire the entity to its chosen provider (item 2).

        `backend` is None on the delegation path (provider='ai_task') — that
        branch never touches the OIG OpenAI-compatible backend. `install` is the
        allow-listed anonymous snapshot fed to the OUTGOING boundary; an empty
        mapping is SAFE (the boundary drops everything not allow-listed), never
        leaky. Do NOT put identifying fields here.
        """
        super().__init__()
        self._provider = provider
        self._backend = backend
        self._install: Mapping[str, Any] = install or {}
        self._attr_unique_id = f"{entry_id}_ai_task"
        self._attr_name = "OIG AI Task"

    async def _async_generate_data(
        self, task: GenDataTask, chat_log: ChatLog
    ) -> GenDataTaskResult:
        if self._provider == "ai_task":
            # Delegate to the host HA's own AI Task entity. The OIG backend is
            # NOT constructed and NOT called on this path. See the note on
            # _async_delegate_to_host_ai_task — the exact delegation call is
            # NOT established by this plan.
            data = await self._async_delegate_to_host_ai_task(task)
        else:
            # The OIG backend is OPTIONAL on the entity — backend=None is the
            # delegation path's marker. async_setup_entry never constructs an
            # entity without a backend for the non-delegation providers, but
            # that is a guarantee held at a distance: a direct call here must
            # still fail closed, not None-dereference. Local binding narrows
            # the union for mypy AND gives the runtime check a real home.
            backend = self._backend
            if backend is None:
                # Classified soft-failure (matches ai/backends.py HTTP path) —
                # brief, no raw data; the UI surfaces this as a usable error.
                raise RuntimeError("AI backend not configured for this entity")
            # K2b/O2 (binding): task.instructions is free text the user typed
            # into HA's AI Task UI and MUST NEVER be forwarded as prompt
            # content — it can embed GPS, box_id, e-mail, entity_id, anything.
            # The backend builds outgoing content itself from an allow-listed
            # install mapping; see ai/backends.py:async_generate_data.
            data = await backend.async_generate_data(
                "ai_task_generate_data", self._anonymous_install(), task.structure)
        return GenDataTaskResult(conversation_id=chat_log.conversation_id, data=data)

    def _anonymous_install(self) -> Mapping[str, Any]:
        """Allow-listed install snapshot for the outgoing prompt (K2b/O2).

        `self._install` is a seam for the entity's construction to populate
        with real installation numbers; until that wiring lands, this is
        empty, which is safe — an empty prompt, never a leaky one.
        """
        return getattr(self, "_install", None) or {}

    async def _async_delegate_to_host_ai_task(self, task: GenDataTask) -> Any:
        """Delegate a GenDataTask to the host HA's own AI Task entity.

        provider='ai_task' means "use the AI I already have configured in Home
        Assistant" (SCOPE-REVISION #8/#9). This branch is what makes the three
        providers co-equal: a user who chose it must NEVER be silently routed
        to the OIG OpenAI-compatible backend (Groq/NVIDIA).

        ⚠️ UNVERIFIED — ai_task is absent from the dev harness (HA 2025.1.4),
        so the real delegation API could not be read or exercised here. This is
        a best-effort implementation of the F1-DESIGN §2 note: call the
        `ai_task.generate_data` service with entity_id omitted so HA resolves
        the user's preferred entity, blocking, returning the response. It MUST
        be re-checked and corrected against the real module when the test
        harness is raised to an ai_task-capable HA (>= 2025.8) — that harness
        bump is a deliberately deferred CI-infra item (see Plan 3 Task 9
        narrowing). It is NOT under test today: the dispatch test monkeypatches
        this method, so what is verified is the dispatch DECISION, not this
        call's correctness.
        """
        return await self.hass.services.async_call(
            "ai_task",
            "generate_data",
            {
                # entity_id omitted on purpose → HA resolves the user's
                # preferred AI Task entity (F1-DESIGN §2).
                "task": task,
            },
            blocking=True,
            return_response=True,
        )


async def async_setup_entry(hass, entry, async_add_entities) -> None:
    """Instantiate the AI Task entity from the stored provider/key (item 2).

    THIN adapter: no network at setup time. AI is OPTIONAL (SCOPE-REVISION #5) —
    every "not configured / cannot call" path adds NO entity and returns without
    raising, so a box without AI simply has no AI Task entity.
    """
    store = AiKeyStore(hass, entry.entry_id)
    provider = await store.async_get_provider()
    if not provider:
        # AI not configured — optional feature, add nothing.
        return

    if provider == "ai_task":
        # Delegation path: use the AI the user already runs in their own HA.
        # The OIG backend is deliberately NOT constructed on this branch.
        async_add_entities(
            [OigAiTaskEntity(
                provider="ai_task", backend=None, install={},
                entry_id=entry.entry_id)]
        )
        return

    if provider in PROVIDERS:
        key = await store.async_get_key()
        if not key:
            # Provider chosen but no key — cannot call the backend, add nothing.
            return
        backend = OpenAiCompatBackend(
            session=async_get_clientsession(hass),
            base_url=PROVIDERS[provider]["base_url"],
            api_key=key,
            model=DEFAULT_MODELS[provider],
        )
        # `install` is the allow-listed anonymous snapshot. No readily-available
        # allow-listed source is wired here yet, and {} is SAFE at the OUTGOING
        # boundary — never invent fields, never pass identifying ones.
        async_add_entities(
            [OigAiTaskEntity(
                provider=provider, backend=backend, install={},
                entry_id=entry.entry_id)]
        )
        return

    # Unknown provider string — add nothing (defensive; config flow constrains this).
    return
