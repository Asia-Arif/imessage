
import { Button, TextArea } from "@heroui/react";
import {
  ImageIcon,
  LoaderIcon,
  SendHorizontalIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import useKeyboardSound from "../../hooks/useKeyboardSound";
import { useChatStore } from "../../store/useChatStore";
import { useSelectedConversation } from "../../hooks/useSelectedConversation";

export function ChatComposer() {
  const composerText = useChatStore((state) => state.composerText);
  const isSoundEnabled = useChatStore((state) => state.isSoundEnabled);
  const sendMediaMessage = useChatStore((state) => state.sendMediaMessage);
  const isSendingMedia = useChatStore((state) => state.isSendingMedia);
  const sendTextMessage = useChatStore((state) => state.sendTextMessage);
  const setComposerText = useChatStore((state) => state.setComposerText);
  const [sendingMessage, setSendingMessage] = useState(false);

  const showSubscriptionModal = useChatStore(
    (state) => state.showSubscriptionModal
  );

  const closeSubscriptionModal = useChatStore(
    (state) => state.closeSubscriptionModal
  );

  const confirmSubscription = useChatStore(
    (state) => state.confirmSubscription
  );

  const { activeConversationId } = useSelectedConversation();
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const mediaInputRef = useRef(null);
  const sendingRef = useRef(false);

  const playSoundIfEnabled = () => {
    if (isSoundEnabled) {
      playRandomKeyStrokeSound();
    }
  };

  const handleSend = async () => {
    if (sendingRef.current) return;
    if (!activeConversationId || !composerText.trim()) return;

    sendingRef.current = true;
    setSendingMessage(true);

    try {
      const didSendMessage = await sendTextMessage(activeConversationId);

      if (didSendMessage) {
        playSoundIfEnabled();
      }
    } finally {
      sendingRef.current = false;
      setSendingMessage(false);
    }
  };

  const handleComposerTextChange = (event) => {
    setComposerText(event.target.value);
    playSoundIfEnabled();
  };

  const handleMediaPick = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    const didSendMessage = await sendMediaMessage({
      conversationId: activeConversationId,
      file,
    });

    if (didSendMessage) {
      playSoundIfEnabled();
    }
  };

  return (
    <>
      <footer className="shrink-0 border-t border-border px-1.5 pb-2 pt-2 sm:px-2">
        {isSendingMedia ? (
          <div className="mx-auto mb-2 flex max-w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted">
            <LoaderIcon
              className="size-4 shrink-0 animate-spin text-accent"
              strokeWidth={2}
              aria-hidden
            />
            <span className="truncate">Uploading media...</span>
          </div>
        ) : null}

        <div className="mx-auto flex w-full max-w-full items-end gap-1.5 px-0.5 sm:gap-2 sm:px-1">
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            className="sr-only"
            disabled={isSendingMedia}
            tabIndex={-1}
            aria-hidden
            onChange={handleMediaPick}
          />

          <Button
            variant="ghost"
            isIconOnly
            isDisabled={isSendingMedia}
            className="size-9 shrink-0 touch-manipulation self-end text-accent"
            onPress={() => mediaInputRef.current?.click()}
          >
            <ImageIcon
              className="size-5 sm:size-6"
              strokeWidth={2}
            />
          </Button>

          <TextArea
            fullWidth
            variant="secondary"
            placeholder="iMessage"
            rows={1}
            value={composerText}
            onChange={handleComposerTextChange}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!sendingRef.current) {
                  handleSend();
                }
              }
            }}
            className="flex-1 rounded-full"
          />

          <Button
            variant="primary"
            isIconOnly
            isDisabled={!composerText.trim() || sendingMessage}
            onPress={handleSend}
          >
            <SendHorizontalIcon className="size-5" />
          </Button>
        </div>
      </footer>

      {showSubscriptionModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">
              Subscribe to Continue
            </h2>

            <p className="mt-3 text-sm text-muted">
              You have reached your free chat limit. Would you like to
              subscribe to continue chatting?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="light"
                onPress={closeSubscriptionModal}
              >
                No, Maybe Later
              </Button>

              <Button
                color="primary"
                onPress={confirmSubscription}
              >
                Yes, Subscribe
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}