import { describe, it, expect } from 'vitest'
import {
  isBbcodeFlag,
  pickTask,
  readTaskDescription,
  taskDescriptionToMarkdown,
  buildTaskUpdateFields,
  pickComment,
  commentToMarkdown,
  buildCommentUpdateFields,
  pickPost,
  readPostTitle,
  postToMarkdown,
  buildPostUpdateFields
} from '../app/utils/b24-entity'

describe('isBbcodeFlag', () => {
  it('truthy variants', () => {
    for (const v of ['Y', 'y', '1', 1, true, 'true']) expect(isBbcodeFlag(v)).toBe(true)
  })
  it('falsy variants', () => {
    for (const v of ['N', 'n', '0', 0, false, '', null, undefined]) expect(isBbcodeFlag(v)).toBe(false)
  })
})

describe('pickTask — tolerant to envelope shape', () => {
  it('{ result: { task } }', () => {
    expect(pickTask({ result: { task: { id: 1 } } })).toEqual({ id: 1 })
  })
  it('{ task }', () => {
    expect(pickTask({ task: { id: 2 } })).toEqual({ id: 2 })
  })
  it('{ result } as the task itself', () => {
    expect(pickTask({ result: { id: 3 } })).toEqual({ id: 3 })
  })
  it('null for junk', () => {
    expect(pickTask(null)).toBeNull()
    expect(pickTask('x')).toBeNull()
  })
})

describe('readTaskDescription — casing + format', () => {
  it('uppercase BBCode', () => {
    expect(readTaskDescription({ DESCRIPTION: '[b]x[/b]', DESCRIPTION_IN_BBCODE: 'Y' }))
      .toEqual({ text: '[b]x[/b]', format: 'bb' })
  })
  it('lowercase HTML', () => {
    expect(readTaskDescription({ description: '<b>x</b>', descriptionInBbcode: 'N' }))
      .toEqual({ text: '<b>x</b>', format: 'html' })
  })
  it('missing description → empty', () => {
    expect(readTaskDescription({})).toEqual({ text: '', format: 'html' })
  })
})

describe('taskDescriptionToMarkdown', () => {
  it('BBCode description → MD', () => {
    expect(taskDescriptionToMarkdown({ DESCRIPTION: '[b]Hi[/b]', DESCRIPTION_IN_BBCODE: 'Y' })).toBe('**Hi**')
  })
  it('HTML description → MD', () => {
    expect(taskDescriptionToMarkdown({ description: '<b>Hi</b>', descriptionInBbcode: 'N' })).toBe('**Hi**')
  })
})

describe('buildTaskUpdateFields', () => {
  it('MD → BBCode description fields', () => {
    expect(buildTaskUpdateFields('**Hi**')).toEqual({ DESCRIPTION: '[b]Hi[/b]', DESCRIPTION_IN_BBCODE: 'Y' })
  })
})

describe('CRM comment', () => {
  it('pickComment from { result }', () => {
    expect(pickComment({ result: { COMMENT: 'x' } })).toEqual({ COMMENT: 'x' })
  })
  it('commentToMarkdown (BBCode)', () => {
    expect(commentToMarkdown({ COMMENT: '[b]Hi[/b]' })).toBe('**Hi**')
  })
  it('buildCommentUpdateFields', () => {
    expect(buildCommentUpdateFields('*x*')).toEqual({ COMMENT: '[i]x[/i]' })
  })
})

describe('Live Feed post', () => {
  it('pickPost takes the first item of the result array', () => {
    expect(pickPost({ result: [{ DETAIL_TEXT: 'a', TITLE: 'T' }, { DETAIL_TEXT: 'b' }] }))
      .toEqual({ DETAIL_TEXT: 'a', TITLE: 'T' })
  })
  it('pickPost tolerates a single object', () => {
    expect(pickPost({ result: { DETAIL_TEXT: 'a' } })).toEqual({ DETAIL_TEXT: 'a' })
  })
  it('readPostTitle', () => {
    expect(readPostTitle({ TITLE: 'Hello' })).toBe('Hello')
  })
  it('postToMarkdown (BBCode)', () => {
    expect(postToMarkdown({ DETAIL_TEXT: '[s]x[/s]' })).toBe('~~x~~')
  })
  it('buildPostUpdateFields keeps the title', () => {
    expect(buildPostUpdateFields('**Hi**', 'My title'))
      .toEqual({ POST_MESSAGE: '[b]Hi[/b]', POST_TITLE: 'My title' })
  })
})
