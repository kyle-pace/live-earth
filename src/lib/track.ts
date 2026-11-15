// Custom analytics events for this lab. Every lab shares the kylepace.dev Amplitude
// project, so each event carries `experiment` with this lab's slug; this wrapper adds it,
// so code here never has to remember.
//
// Name events the principles' way: Title Case, past-tense verb first ("Picked Track",
// "Opened Stop"). Add each new event to the kylepace.dev tracking plan in Amplitude in
// the same change. Page views and clicks are already captured; only add an event when it
// answers a real question about how the lab gets used.
import { track as send } from 'kp-design/analytics';

export const EXPERIMENT = 'live-earth';

export function track(event: string, properties: Record<string, unknown> = {}) {
  send(event, { experiment: EXPERIMENT, ...properties });
}
