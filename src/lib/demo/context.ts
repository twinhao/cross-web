import { getContext, setContext } from "svelte";

const DEMO_CONTEXT = Symbol("cross-demo");
export function setDemoContext() { setContext(DEMO_CONTEXT, true); }
export function inDemoContext(): boolean { return getContext<boolean>(DEMO_CONTEXT) === true; }
