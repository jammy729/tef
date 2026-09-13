// AI-generated curriculum store (spec §3.2.3) — global, not per-profile: generated units are
// shared course content, same as the static ones in src/content/course.js. Only progress
// (learningProgress in storage.js) is per-profile.
const KEY = 'tef.generatedContent.v1'

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? { units: [], items: {} }
  } catch {
    return { units: [], items: {} }
  }
}

function write(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function getGeneratedUnits() {
  return read().units
}

export function getGeneratedItem(id) {
  return read().items[id] ?? null
}

export function addGeneratedUnit(unit, items) {
  const data = read()
  data.units.push(unit)
  Object.assign(data.items, items)
  write(data)
}
