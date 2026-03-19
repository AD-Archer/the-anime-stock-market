'use client'

// Inspired by react-hot-toast library
import * as React from 'react'

import {
  ToastAction,
  type ToastActionElement,
  type ToastProps,
} from '@/components/ui/toast'

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  reportable?: boolean
  reportContext?: string
}

const actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType['ADD_TOAST']
      toast: ToasterToast
    }
  | {
      type: ActionType['UPDATE_TOAST']
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType['DISMISS_TOAST']
      toastId?: ToasterToast['id']
    }
  | {
      type: ActionType['REMOVE_TOAST']
      toastId?: ToasterToast['id']
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: 'REMOVE_TOAST',
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t,
        ),
      }

    case 'DISMISS_TOAST': {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t,
        ),
      }
    }
    case 'REMOVE_TOAST':
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, 'id'>

const REPORTABLE_TOAST_TEXT =
  /(failed?|error|cannot|could not|unable|invalid|blocked|issue)/i

function toPlainText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map((child) => toPlainText(child)).join(' ')
  }

  if (React.isValidElement(node)) {
    return toPlainText((node.props as { children?: React.ReactNode }).children)
  }

  return ''
}

function truncate(value: string, max = 500): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 3)}...`
}

function shouldAttachReportAction(props: Toast): boolean {
  if (props.reportable === false) return false
  if (props.reportable === true) return true
  if (props.variant === 'destructive') return true

  const text = `${toPlainText(props.title)} ${toPlainText(props.description)}`.trim()
  return REPORTABLE_TOAST_TEXT.test(text)
}

function buildSupportHref(props: Toast): string {
  const title = truncate(toPlainText(props.title).trim() || 'Issue report')
  const description = truncate(toPlainText(props.description).trim(), 1200)
  const context = truncate((props.reportContext || '').trim(), 1200)
  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''
  const timestamp = new Date().toISOString()

  const body = [
    'I encountered an issue from an in-app notification.',
    '',
    `Toast title: ${title}`,
    description ? `Toast details: ${description}` : '',
    context ? `Extra context: ${context}` : '',
    pageUrl ? `Page: ${pageUrl}` : '',
    `Timestamp: ${timestamp}`,
  ]
    .filter(Boolean)
    .join('\n')

  const params = new URLSearchParams({
    tag: 'error',
    subject: title.startsWith('Error:') ? title : `Error: ${title}`,
    body,
  })

  return `/support?${params.toString()}`
}

function withReportAction(props: Toast): Toast {
  if (props.action || !shouldAttachReportAction(props)) return props

  const action = React.createElement(
    ToastAction,
    {
      altText: 'Report this issue',
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        if (typeof window === 'undefined') return
        window.location.assign(buildSupportHref(props))
      },
    },
    'Report Issue',
  ) as unknown as ToastActionElement

  return {
    ...props,
    action,
  }
}

function toast({ ...props }: Toast) {
  const id = genId()
  const normalized = withReportAction(props)

  const update = (props: ToasterToast) =>
    dispatch({
      type: 'UPDATE_TOAST',
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id })

  dispatch({
    type: 'ADD_TOAST',
    toast: {
      ...normalized,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  }
}

export { useToast, toast }
