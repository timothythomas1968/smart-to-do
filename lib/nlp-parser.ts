import type { ParsedTask } from "./types"

// Date parsing patterns and utilities
const DATE_PATTERNS = {
  today: /\b(today|now)\b/i,
  tomorrow: /\btomorrow\b/i,
  endOfWeek: /\b(end of (the )?week|by friday|this friday)\b/i,
  endOfMonth: /\b(end of (the )?month|month end)\b/i,
  nextWeek: /\bnext week\b/i,
  nextMonth: /\bnext month\b/i,
  specificDate: /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/,
  monthDay:
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(st|nd|rd|th)?\b/i,
  monthReference:
    /\b(early|mid|late|beginning of|end of)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  dayOfWeek: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  inDays: /\bin\s+(\d+)\s+days?\b/i,
  inWeeks: /\bin\s+(\d+)\s+weeks?\b/i,
}

// Priority patterns
const PRIORITY_PATTERNS = {
  p1: /\b(p1|priority\s*1|high\s*priority|urgent\s*priority)\b/i,
  p2: /\b(p2|priority\s*2|medium\s*priority)\b/i,
  p3: /\b(p3|priority\s*3|normal\s*priority|low\s*priority)\b/i,
  p4: /\b(p4|priority\s*4|lowest\s*priority)\b/i,
}

// Urgency indicators
const URGENCY_PATTERNS = /\b(urgent|asap|immediately|critical|emergency|rush|high\s*priority|needs\s*attention)\b/i

// Owner patterns
const OWNER_PATTERNS = {
  assignTo: /\b(assign\s*to|for|@)[\s:]*([\w\s]+?)(?=\s|$|,|\.|!|\?)/i,
  responsible: /\b(responsible[:\s]*([\w\s]+?)(?=\s|$|,|\.|!|\?))/i,
  owner: /\b(owner[:\s]*([\w\s]+?)(?=\s|$|,|\.|!|\?))/i,
  shouldDo: /^([\w\s]+?)\s+(should|will|needs?\s+to|have\s+to|must)\s+/i,
  // I need to do something - owner is "Me"
  iNeedTo: /^(i\s+)?(need\s+to|have\s+to|must|should)\s+/i,
}

// Subject extraction patterns
const SUBJECT_PATTERNS = {
  about: /\b(about|regarding|re[:\s])[\s:]*([\w\s]+?)(?=\s(?:due|by|for|@|assign|priority|urgent|p[1-4])|$)/i,
  project: /\b(project[:\s]*([\w\s]+?)(?=\s|$|,|\.|!|\?))/i,
  category: /\b(category[:\s]*([\w\s]+?)(?=\s|$|,|\.|!|\?))/i,
  // Ask/tell/contact someone - they become the subject
  askTell:
    /\b(ask|tell|contact|call|email|message|remind)\s+([\w\s]+?)(?=\s+(?:to|about|that|if|when|where|why|how)|$)/i,
  // Meeting with someone - they become the subject
  meetWith: /\b(meet\s+with|meeting\s+with|schedule\s+with)\s+([\w\s]+?)(?=\s|$|,|\.|!|\?)/i,
  // Send/give something to someone - they become the subject
  sendTo: /\b(send|give|deliver|provide)\s+.+?\s+to\s+([\w\s]+?)(?=\s|$|,|\.|!|\?)/i,
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // Sunday = 0, Saturday = 6
}

function moveToNextMonday(date: Date): Date {
  const nextMonday = new Date(date)
  const day = date.getDay()

  if (day === 0) {
    // Sunday
    nextMonday.setDate(date.getDate() + 1) // Move to Monday
  } else if (day === 6) {
    // Saturday
    nextMonday.setDate(date.getDate() + 2) // Move to Monday
  }

  return nextMonday
}

function parseDate(text: string): Date | undefined {
  const now = new Date()

  // Today
  if (DATE_PATTERNS.today.test(text)) {
    return now
  }

  // Tomorrow
  if (DATE_PATTERNS.tomorrow.test(text)) {
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    return tomorrow
  }

  // End of week (Friday)
  if (DATE_PATTERNS.endOfWeek.test(text)) {
    const endOfWeek = new Date(now)
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7
    endOfWeek.setDate(now.getDate() + daysUntilFriday)
    return endOfWeek
  }

  // End of month
  if (DATE_PATTERNS.endOfMonth.test(text)) {
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return endOfMonth
  }

  const dayOfWeekMatch = text.match(DATE_PATTERNS.dayOfWeek)
  const hasNextWeek = DATE_PATTERNS.nextWeek.test(text)

  if (dayOfWeekMatch && hasNextWeek) {
    // Handle "Wednesday next week" type patterns
    const dayName = dayOfWeekMatch[1].toLowerCase()
    const dayIndex = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(dayName)

    if (dayIndex !== -1) {
      const targetDate = new Date(now)
      // First, go to next week (add 7 days)
      targetDate.setDate(now.getDate() + 7)
      // Then find the specific day in that week
      const daysFromMonday = (dayIndex - 1 + 7) % 7 // Monday = 0, Sunday = 6
      const mondayOfNextWeek = new Date(targetDate)
      mondayOfNextWeek.setDate(targetDate.getDate() - ((targetDate.getDay() - 1 + 7) % 7))
      mondayOfNextWeek.setDate(mondayOfNextWeek.getDate() + daysFromMonday)
      return mondayOfNextWeek
    }
  }

  // Next week (without specific day)
  if (DATE_PATTERNS.nextWeek.test(text) && !dayOfWeekMatch) {
    const nextWeek = new Date(now)
    nextWeek.setDate(now.getDate() + 7)
    return nextWeek
  }

  // Next month
  if (DATE_PATTERNS.nextMonth.test(text)) {
    const nextMonth = new Date(now)
    nextMonth.setMonth(now.getMonth() + 1)
    return nextMonth
  }

  // Specific date (MM/DD/YYYY or MM-DD-YYYY)
  const specificDateMatch = text.match(DATE_PATTERNS.specificDate)
  if (specificDateMatch) {
    const [, month, day, year] = specificDateMatch
    const fullYear = year.length === 2 ? 2000 + Number.parseInt(year) : Number.parseInt(year)
    const targetDate = new Date(fullYear, Number.parseInt(month) - 1, Number.parseInt(day))
    // Apply weekend adjustment
    if (isWeekend(targetDate)) {
      return moveToNextMonday(targetDate)
    }
    return targetDate
  }

  // Month and day (e.g., "August 15th")
  const monthDayMatch = text.match(DATE_PATTERNS.monthDay)
  if (monthDayMatch) {
    const [, monthName, day] = monthDayMatch
    const monthIndex = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ].indexOf(monthName.toLowerCase())

    if (monthIndex !== -1) {
      const targetDate = new Date(now.getFullYear(), monthIndex, Number.parseInt(day))
      // If the date has passed this year, assume next year
      if (targetDate < now) {
        targetDate.setFullYear(now.getFullYear() + 1)
      }
      // Apply weekend adjustment
      if (isWeekend(targetDate)) {
        return moveToNextMonday(targetDate)
      }
      return targetDate
    }
  }

  // Month reference (e.g., "mid August", "end of September")
  const monthRefMatch = text.match(DATE_PATTERNS.monthReference)
  if (monthRefMatch) {
    const [, timeRef, monthName] = monthRefMatch
    const monthIndex = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ].indexOf(monthName.toLowerCase())

    if (monthIndex !== -1) {
      const targetDate = new Date(now.getFullYear(), monthIndex, 1)

      // Adjust based on time reference
      if (timeRef.toLowerCase().includes("mid")) {
        targetDate.setDate(15)
      } else if (timeRef.toLowerCase().includes("end")) {
        targetDate.setMonth(monthIndex + 1, 0) // Last day of month
      } else if (timeRef.toLowerCase().includes("early") || timeRef.toLowerCase().includes("beginning")) {
        targetDate.setDate(5)
      }

      // If the date has passed this year, assume next year
      if (targetDate < now) {
        targetDate.setFullYear(now.getFullYear() + 1)
      }
      // Apply weekend adjustment
      if (isWeekend(targetDate)) {
        return moveToNextMonday(targetDate)
      }
      return targetDate
    }
  }

  // Day of week (without "next week" modifier)
  if (dayOfWeekMatch && !hasNextWeek) {
    const dayName = dayOfWeekMatch[1].toLowerCase()
    const dayIndex = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(dayName)

    if (dayIndex !== -1) {
      const targetDate = new Date(now)
      const daysUntilTarget = (dayIndex - now.getDay() + 7) % 7 || 7
      targetDate.setDate(now.getDate() + daysUntilTarget)
      // Apply weekend adjustment
      if (isWeekend(targetDate)) {
        return moveToNextMonday(targetDate)
      }
      return targetDate
    }
  }

  // In X days
  const inDaysMatch = text.match(DATE_PATTERNS.inDays)
  if (inDaysMatch) {
    const days = Number.parseInt(inDaysMatch[1])
    const targetDate = new Date(now)
    targetDate.setDate(now.getDate() + days)
    // Apply weekend adjustment
    if (isWeekend(targetDate)) {
      return moveToNextMonday(targetDate)
    }
    return targetDate
  }

  // In X weeks
  const inWeeksMatch = text.match(DATE_PATTERNS.inWeeks)
  if (inWeeksMatch) {
    const weeks = Number.parseInt(inWeeksMatch[1])
    const targetDate = new Date(now)
    targetDate.setDate(now.getDate() + weeks * 7)
    // Apply weekend adjustment
    if (isWeekend(targetDate)) {
      return moveToNextMonday(targetDate)
    }
    return targetDate
  }

  return undefined
}

function parsePriority(text: string): "P1" | "P2" | "P3" | "P4" {
  if (PRIORITY_PATTERNS.p1.test(text)) return "P1"
  if (PRIORITY_PATTERNS.p2.test(text)) return "P2"
  if (PRIORITY_PATTERNS.p3.test(text)) return "P3"
  if (PRIORITY_PATTERNS.p4.test(text)) return "P4"

  // Default priority
  return "P3"
}

function parseUrgency(text: string): boolean {
  return URGENCY_PATTERNS.test(text)
}

function getCustomNames(userId?: string): string[] {
  try {
    const storageKey = userId ? `customNames_${userId}` : "customNames_guest"
    const customNames = localStorage.getItem(storageKey)
    return customNames ? JSON.parse(customNames) : []
  } catch {
    return []
  }
}

function parseOwner(text: string, userId?: string): string {
  const customNames = getCustomNames(userId)

  console.log("[v0] Parsing owner for text:", text)
  console.log("[v0] Available custom names:", customNames)

  // Check for "I" patterns first and convert to "Me"
  const iPatterns = [
    /^i\s+(need\s+to|have\s+to|must|should|will)\s+/i,
    /^i\s+(am\s+going\s+to|plan\s+to)\s+/i,
    /\bi\s+(need\s+to|have\s+to|must|should|will)\s+/i,
  ]

  for (const pattern of iPatterns) {
    if (pattern.test(text)) {
      console.log("[v0] Found 'I' pattern, converting to 'Me'")
      return "Me"
    }
  }

  // Check if any custom name appears in assignment patterns
  for (const name of customNames) {
    const namePattern = new RegExp(`\\b${name}\\b`, "i")
    if (namePattern.test(text)) {
      console.log("[v0] Found custom name in text:", name)
      // Check if this name is being assigned work
      const assignPattern = new RegExp(`\\b(assign\\s*to|for|@)\\s*${name}\\b`, "i")
      const shouldPattern = new RegExp(`^${name}\\s+(should|will|needs?\\s+to|have\\s+to|must)\\s+`, "i")

      if (assignPattern.test(text) || shouldPattern.test(text)) {
        console.log("[v0] Recognized as owner:", name)
        return name
      }
    }
  }

  // Check if someone else is explicitly assigned
  const shouldDoMatch = text.match(OWNER_PATTERNS.shouldDo)
  if (shouldDoMatch && shouldDoMatch[1]) {
    const owner = shouldDoMatch[1].trim()
    console.log("[v0] Found owner from shouldDo pattern:", owner)
    // Capitalize first letter of each word
    return owner.replace(/\b\w/g, (l) => l.toUpperCase())
  }

  // Check for explicit assignment patterns
  for (const [key, pattern] of Object.entries(OWNER_PATTERNS)) {
    if (key === "shouldDo" || key === "iNeedTo") continue // Already handled above

    const match = text.match(pattern)
    if (match && match[2]) {
      const owner = match[2].trim()
      return owner.replace(/\b\w/g, (l) => l.toUpperCase())
    }
  }

  // Default to "Me" for all other cases
  console.log("[v0] Defaulting owner to: Me")
  return "Me"
}

function parseSubject(text: string, userId?: string): string | undefined {
  const customNames = getCustomNames(userId)

  // Check if any custom name appears in subject patterns
  for (const name of customNames) {
    const namePattern = new RegExp(`\\b${name}\\b`, "i")
    if (namePattern.test(text)) {
      // Check if this name is being referenced as a subject
      const askPattern = new RegExp(`\\b(ask|tell|contact|call|email|message|remind)\\s+${name}\\b`, "i")
      const meetPattern = new RegExp(`\\b(meet\\s+with|meeting\\s+with|schedule\\s+with)\\s+${name}\\b`, "i")
      const sendPattern = new RegExp(`\\b(send|give|deliver|provide)\\s+.+?\\s+to\\s+${name}\\b`, "i")

      if (askPattern.test(text) || meetPattern.test(text) || sendPattern.test(text)) {
        return name
      }
    }
  }

  // Try different subject patterns
  for (const [key, pattern] of Object.entries(SUBJECT_PATTERNS)) {
    const match = text.match(pattern)
    if (match && match[2]) {
      const subject = match[2].trim()
      // Clean up common words that might be captured
      const cleanSubject = subject.replace(/\b(to|about|that|if|when|where|why|how|the|a|an)\s*$/i, "").trim()
      if (cleanSubject) {
        // Capitalize first letter of each word
        return cleanSubject.replace(/\b\w/g, (l) => l.toUpperCase())
      }
    }
  }
  return undefined
}

function extractTitle(text: string): string {
  return text.trim()
}

export function parseTaskFromNaturalLanguage(input: string, userId?: string): ParsedTask {
  const cleanInput = input.trim()

  return {
    title: extractTitle(cleanInput),
    description: cleanInput, // Keep original as description
    owner: parseOwner(cleanInput, userId),
    subject: parseSubject(cleanInput, userId),
    due_date: parseDate(cleanInput),
    priority: parsePriority(cleanInput),
    is_urgent: parseUrgency(cleanInput),
  }
}

// Helper function to format parsed task for display
export function formatParsedTask(parsed: ParsedTask): string {
  const parts: string[] = []

  parts.push(`Title: ${parsed.title}`)

  if (parsed.owner) {
    parts.push(`Owner: ${parsed.owner}`)
  }

  if (parsed.subject) {
    parts.push(`Subject: ${parsed.subject}`)
  }

  if (parsed.due_date) {
    parts.push(`Due: ${parsed.due_date.toLocaleDateString()}`)
  }

  parts.push(`Priority: ${parsed.priority}`)

  if (parsed.is_urgent) {
    parts.push(`🚨 URGENT`)
  }

  return parts.join(" | ")
}

export const parseTask = parseTaskFromNaturalLanguage

export { isWeekend, moveToNextMonday }
