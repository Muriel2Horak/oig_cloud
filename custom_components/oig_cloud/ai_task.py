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

from typing import Any

from homeassistant.components.ai_task import (
    AITaskEntity,
    AITaskEntityFeature,
    GenDataTask,
    GenDataTaskResult,
)
from homeassistant.components.conversation import (  # type: ignore[attr-defined]
    ChatLog,  # exists on HA >= 2025.8 (this module's target); absent on the
)             # 2025.1.4 dev harness, where the module is never imported anyway


class OigAiTaskEntity(AITaskEntity):
    """Generates structured data via the user's chosen provider.

    THREE co-equal providers (SCOPE-REVISION #8), and 'ai_task' is one of them:
    the user asked for the AI they already run in their own HA. Dispatch MUST
    branch on it — falling through to the OIG backend would send that user's
    prompts to Groq/NVIDIA, which is precisely the choice they declined.
    """

    _attr_supported_features = AITaskEntityFeature.GENERATE_DATA

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
            data = await self._backend.async_generate_data(
                task.instructions, task.structure)
        return GenDataTaskResult(conversation_id=chat_log.conversation_id, data=data)

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
