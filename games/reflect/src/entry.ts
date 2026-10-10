/* ThinkStill Reflect — browser entry. `ThinkStillReflect.mount(element, options)` puts the whole console (hub, lobby,
 * rituals) into the element's shadow root. Used by the Framer component, the artifact page and the dev page. */
import { ReflectConsole, ReflectOptions } from './console/console';

export const VERSION = '0.1.0-pilot1';
export function mount(el: HTMLElement, opts?: ReflectOptions) {
  const c = new ReflectConsole(el, opts || {});
  return { destroy: () => c.destroy(), console: c };
}
(globalThis as any).ThinkStillReflect = { mount, version: VERSION };
