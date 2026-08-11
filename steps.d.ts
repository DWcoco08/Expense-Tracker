/// <reference types='codeceptjs' />
type steps_file = typeof import('./steps_file.js').default

declare namespace CodeceptJS {
  interface SupportObject {
    I: I
    current: unknown
  }
  interface Methods extends Playwright {}
  interface I extends ReturnType<steps_file> {}
  namespace Translation {
    type Actions = Record<string, never>
  }
}
