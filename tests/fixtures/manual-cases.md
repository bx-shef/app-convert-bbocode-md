# Manual conversion test cases

Procedure:
1. Open `/` (two-pane converter).
2. For each case below, copy **Input** into the matching pane.
3. Record what the other pane actually produced under "Got" (or paste it back to me).
4. Mark expected — if "Got" is wrong, fill in "Expected" with the correct output.
5. I'll fix the converter logic + add a unit test for each case I touched.

Chat mode (toolbar checkbox): mostly OFF unless a case explicitly says ON.

---

## A. BBCode → Markdown (paste into LEFT / Markdown? — wait, the **left pane is Markdown, right is BBCode**)

Reminder of layout after the swap: **left = Markdown**, **right = BBCode**.
For BBCode → MD cases below, paste **Input** into the **right (BBCode)** pane and read the result from the **left (Markdown)** pane.

### A1. Inline formatting
**Input (BBCode):**
```
[b]bold[/b] [i]italic[/i] [u]under[/u] [s]strike[/s]
```
**Got (MD):** _____________
**Expected (MD):** _____________

### A2. Mixed nesting
**Input:**
```
[b]hello [i]world[/i][/b], [u][s]combo[/s][/u]
```
**Got:** _____________
**Expected:** _____________

### A3. Links
**Input:**
```
Open [url=https://bitrix24.ru]Bitrix24[/url] or autolink: [url]https://example.com[/url]
```
**Got:** _____________
**Expected:** _____________

### A4. Image
**Input:**
```
[img]https://example.com/pic.png[/img]
```
**Got:** _____________
**Expected:** _____________

### A5. Inline code + fenced
**Input:**
```
Use [code]npm i[/code] or:
[code lang=js]const x = 1;
const y = 2;[/code]
```
**Got:** _____________
**Expected:** _____________

### A6. Quote multiline
**Input:**
```
[quote]первая строка
вторая строка[/quote]
```
**Got:** _____________
**Expected:** _____________

### A7. Lists
**Input:**
```
[list][*]apple[*]pear[*]plum[/list]

[list=1][*]первый[*]второй[*]третий[/list]
```
**Got:** _____________
**Expected:** _____________

### A8. Headings
**Input:**
```
[h1]Заголовок 1[/h1]
[h3]Подзаголовок 3[/h3]
[h6]Самый мелкий[/h6]
```
**Got:** _____________
**Expected:** _____________

### A9. HR + paragraphs
**Input:**
```
Параграф один.

[hr]

Параграф два.
```
**Got:** _____________
**Expected:** _____________

### A10. Table (chat mode OFF — должна стать GFM)
**Input:**
```
[table][tr][th]Код[/th][th]Название[/th][/tr][tr][td]new[/td][td]Новый[/td][/tr][tr][td]processing[/td][td]В обработке[/td][/tr][/table]
```
**Got:** _____________
**Expected:** _____________

### A11. Same table — chat mode ON (галка)
**Input:** (тот же что A10)
**Got:** _____________
**Expected:** _____________

### A12. Реальный пример из задачи Битрикс24
**Input:**
```
Когда мы забираем заказ на стадии new там нет контактных данных.
Необходимо создавать сделку без контакта
На стадии процессинг
или иные
мы получим контактные данные
Надо по номеру телефона поискать/создать контакт и выбрать в сделке

[table]
[tr]
[th]Код статуса[/th]
[th]Название статуса[/th]
[th]Описание статуса[/th]
[/tr]
[tr]
[td]new[/td]
[td]Новый[/td]
[td]Заказ оформлен покупателем и ожидает реакции магазина[/td]
[/tr]
[tr]
[td]processing[/td]
[td]В обработке[/td]
[td]Заказ принят в обработку магазином[/td]
[/tr]
[/table]

После этого стоит настроить [url=https://bel.bitrix24.ru/workgroups/group/556/tasks/task/view/32374/]работу приложения оплата.[/url]
```
**Got (chat mode OFF):** _____________
**Expected:** _____________

**Got (chat mode ON):** _____________
**Expected:** _____________

### A13. Code-блок с BBCode внутри (literal)
**Input:**
```
[code]Look: [b]NOT bold[/b] inside code[/code]
```
**Got:** _____________
**Expected:** _____________

### A14. BR / переводы строк
**Input:**
```
строка1[br]строка2
```
**Got:** _____________
**Expected:** _____________

---

## B. Markdown → BBCode (paste into LEFT pane)

### B1. Inline
**Input (MD):**
```
**bold** *italic* <u>under</u> ~~strike~~
```
**Got (BBCode):** _____________
**Expected:** _____________

### B2. Link + autolink + image
**Input:**
```
[Bitrix24](https://bitrix24.ru) and <https://example.com> and ![alt](https://x/p.png)
```
**Got:** _____________
**Expected:** _____________

### B3. Heading + paragraph
**Input:**
```
# Заголовок

Параграф один.

Параграф два.
```
**Got:** _____________
**Expected:** _____________

### B4. List unordered + ordered
**Input:**
```
- one
- two
- three

1. первый
2. второй
```
**Got:** _____________
**Expected:** _____________

### B5. Blockquote multiline
**Input:**
```
> Цитата строка 1
> Строка 2
```
**Got:** _____________
**Expected:** _____________

### B6. Fenced code with lang
**Input:**
````
```ts
const a: number = 1
```
````
**Got:** _____________
**Expected:** _____________

### B7. GFM table (chat mode OFF)
**Input:**
```
| Код | Название |
| --- | --- |
| new | Новый |
| processing | В обработке |
```
**Got:** _____________
**Expected:** _____________

### B8. Тот же GFM — chat mode ON
**Got:** _____________
**Expected:** _____________

### B9. HR
**Input:**
```
Раз
---
Два
```
**Got:** _____________
**Expected:** _____________

---

## C. Roundtrip (для контроля)

### C1. BBCode → MD → BBCode идентичность
Прогнать A1, A3, A7, A8, A10 — проверить что обратно даёт исходный BBCode.

### C2. MD → BBCode → MD идентичность
Прогнать B1, B3, B4, B7.

---

## Заметки от пользователя

(сюда напишешь общие наблюдения — что бесит, что хочется иначе, какие теги ещё нужны)
