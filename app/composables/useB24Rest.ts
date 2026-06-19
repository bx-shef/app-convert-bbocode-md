import type { B24Frame } from '@bitrix24/b24jssdk'
import { Text } from '@bitrix24/b24jssdk'
import { useB24 } from './useB24'
import { taskDescriptionToMarkdown, buildTaskUpdateFields, pickTask } from '~/utils/b24-entity'

/** Thrown when a REST action is attempted outside a Bitrix24 frame. */
export class B24NotReadyError extends Error {
  constructor() {
    super('Bitrix24 frame is not initialized')
    this.name = 'B24NotReadyError'
  }
}

/**
 * REST wrappers over the (non-deprecated) `actions.v2.call.make` API.
 *
 * Tasks first: load a task's description into the editor as Markdown and save
 * the edited Markdown back as BBCode. Pure parsing/building lives in
 * `app/utils/b24-entity.ts` (unit-tested); this composable only does the call
 * and error mapping. Live behaviour needs hands-on QA in a real portal.
 */
export function useB24Rest() {
  const b24 = useB24()

  function frame(): B24Frame {
    if (!b24.isInit()) throw new B24NotReadyError()
    return b24.get() as B24Frame
  }

  /** Load a task description and return it converted to Markdown. */
  async function loadTaskMarkdown(id: number): Promise<string> {
    const $b24 = frame()
    const res = await $b24.actions.v2.call.make({
      method: 'tasks.task.get',
      params: { taskId: id },
      requestId: Text.getUuidRfc4122()
    })
    if (!res.isSuccess) throw new Error(res.getErrorMessages().join('; '))
    const task = pickTask(res.getData())
    if (!task) throw new Error(`Task #${id} not found`)
    return taskDescriptionToMarkdown(task)
  }

  /** Save Markdown back to a task description (stored as BBCode). */
  async function saveTaskMarkdown(id: number, markdown: string): Promise<void> {
    const $b24 = frame()
    const res = await $b24.actions.v2.call.make({
      method: 'tasks.task.update',
      params: { taskId: id, fields: buildTaskUpdateFields(markdown) },
      requestId: Text.getUuidRfc4122()
    })
    if (!res.isSuccess) throw new Error(res.getErrorMessages().join('; '))
  }

  return { loadTaskMarkdown, saveTaskMarkdown }
}
