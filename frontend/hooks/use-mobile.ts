import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

function getMediaQuery() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
}

function getSnapshot() {
  return getMediaQuery().matches
}

function getServerSnapshot() {
  return false
}

function subscribe(callback: () => void) {
  const mql = getMediaQuery()
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}
