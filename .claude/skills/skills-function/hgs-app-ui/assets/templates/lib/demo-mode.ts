// Demo mode swaps every data-fetching service (Opportunity, Customer,
// User) from real HTTP calls to an in-memory mock store, so the whole
// app runs standalone — no backend, no database — for an executive demo.
// Flip VITE_DEMO_MODE=false (or unset it) to restore the real Milestone 1
// backend integration; no other code needs to change.
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true'
}

// A small artificial delay so demo interactions feel like they're talking
// to a real network, rather than resolving instantly (which reads as
// obviously fake in a live demo).
export function demoDelay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
