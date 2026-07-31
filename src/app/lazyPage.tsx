import { lazy, type ComponentType } from "react"

export function lazyPage<
  TModule extends Record<string, ComponentType<unknown>>,
  TName extends keyof TModule,
>(loader: () => Promise<TModule>, exportName: TName) {
  return lazy(() => loader().then((module) => ({ default: module[exportName] })))
}
