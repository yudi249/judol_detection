export type ContentScriptContextState = {
  isInvalid: boolean;
};

export function isContentContextInvalid(context: ContentScriptContextState): boolean {
  try {
    return context.isInvalid;
  } catch (error) {
    if (isExtensionContextInvalidated(error)) {
      return true;
    }

    throw error;
  }
}

export function registerRuntimeMessageListenerSafely(
  context: ContentScriptContextState,
  registerListener: () => void,
): void {
  if (isContentContextInvalid(context)) {
    return;
  }

  try {
    registerListener();
  } catch (error) {
    if (isExtensionContextInvalidated(error)) {
      return;
    }

    throw error;
  }
}

export async function sendRuntimeMessageSafely<TMessage, TResponse>(
  context: ContentScriptContextState,
  sendMessage: (message: TMessage) => Promise<TResponse>,
  message: TMessage,
): Promise<TResponse | undefined> {
  if (isContentContextInvalid(context)) {
    return undefined;
  }

  try {
    const response = await sendMessage(message);
    return isContentContextInvalid(context) ? undefined : response;
  } catch (error) {
    if (isExtensionContextInvalidated(error)) {
      return undefined;
    }

    throw error;
  }
}

function isExtensionContextInvalidated(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes('extension context invalidated')
  );
}
