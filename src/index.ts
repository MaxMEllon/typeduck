const types = new Map<string, boolean>() 

class DuplicationActionTypeError extends Error {}

declare const process: {
  env: {
    NODE_ENV?: string
  }
}

const createActionTypeWithValidation = (type: string) => {
  if (process.env.NODE_ENV !== "production") {
    if (types.has(type)) throw new DuplicationActionTypeError(`${type} is already registrated`)
    types.set(type, true)
  }
  return type
}

export type Action<P> = {
  type: string
  payload: P
  meta?: Object
  error?: boolean
}

export type AnyAction = Action<any>

export interface ActionCreator<P> {
  (payload: P): Action<P>;
  is: (target: string | Action<any>) => boolean
  myType: string
}

export function createAction<P = void>(type: string, meta?: Object | undefined, error?: boolean): ActionCreator<P> {
  const t = createActionTypeWithValidation(type)
  const action = (payload: P): Action<P> => {
    const err = payload instanceof Error || error
    return typeof err === "boolean" && err ? {
      type: t,
      payload,
      meta,
      error: true
    } : {
      type: t,
      payload,
      meta,
    }
 }
  action.is = (target: string | { type: string }): boolean => {
    if (typeof target === "string") {
      return type === target
    }
    return type === target.type
  }
  action.myType = type
  return action
}

export function createProgressAction<P, S, E = Error>(type: string) {
  const readyType = createActionTypeWithValidation(`${type}/ready`)
  const successType = createActionTypeWithValidation(`${type}/success`)
  const failureType = createActionTypeWithValidation(`${type}/failure`)
  return {
    ready: createAction<P>(readyType),
    success: createAction<S>(successType),
    failure: createAction<E>(failureType),
  }
}

export function createActionFactory(prefix: string) {
  return <P = void>(type: string) => {
    const t = createActionTypeWithValidation(`${prefix}/${type}`)
    return createAction<P>(t)
  }
}

interface Handler<S, P> {
  (state: S, payload: P): S
}

interface Reducer<S> {
  (state: S, action: AnyAction): S
  case<P>(actionCreator: ActionCreator<P>, handler: Handler<S, P>): this
}

export function createReducerWithInitialState<S>(initialState: S): Reducer<S> {
  const actions = new Map<string, Handler<S, any>>()
  const reducer = (state: S = initialState, { type, payload }: AnyAction) => {
    const act = actions.has(type) && actions.get(type)
    return act ? act(state, payload) : state
  }
  reducer.case = <P>(actionCreator: ActionCreator<P>, handler: Handler<S, P>) => {
    actions.set(actionCreator.myType, handler)
    return reducer
  }
  return reducer
}